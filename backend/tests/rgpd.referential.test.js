import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';

const { stubModule } = vi.hoisted(() => ({
  stubModule: (vi) => async (importOriginal) => {
    const actual = await importOriginal();
    return Object.fromEntries(
      Object.keys(actual).map(key => [
        key,
        typeof actual[key] === 'function' ? vi.fn().mockResolvedValue(undefined) : actual[key]
      ])
    );
  }
}));
vi.mock('../src/services/email.service.js', stubModule(vi));

import app from '../src/app.js';
import { connectTestDb, disconnectTestDb, clearDatabase } from './helpers/db.js';
import { createGroup, createService, createUser, createContact, createMail, tokenFor } from './helpers/fixtures.js';
import { Category, Subject, RetentionAlert, RETENTION_ALERT_STATUS } from '../src/models/index.js';
import { COMMUNE_CATEGORIES, toCategoryPayload, SORT_FINAL } from '../src/data/communeCategories.js';
import { scanRetention } from '../src/services/retention.service.js';

describe('Référentiel type mairie', () => {
  let adminToken, agentToken, admin, agent, service, contact;

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await clearDatabase();
    const adminGroup = await createGroup('Administrateur');
    const userGroup = await createGroup('Utilisateur');
    service = await createService();
    contact = await createContact();
    admin = await createUser({ group: adminGroup, username: 'admin.ref' });
    agent = await createUser({ group: userGroup, services: [service], username: 'agent.ref' });
    adminToken = tokenFor(admin);
    agentToken = tokenFor(agent);
  });

  describe('Cohérence du référentiel', () => {
    it('ne pose aucune durée sur les catégories en conservation définitive', () => {
      const faulty = COMMUNE_CATEGORIES
        .filter(entry => entry.sortFinal === SORT_FINAL.CONSERVATION)
        .map(toCategoryPayload)
        .filter(payload => payload.retentionEnabled || payload.retentionDuration);

      expect(faulty).toEqual([]);
    });

    it('active une durée sur toutes les catégories à éliminer ou à trier', () => {
      const faulty = COMMUNE_CATEGORIES
        .filter(entry => entry.sortFinal !== SORT_FINAL.CONSERVATION)
        .map(toCategoryPayload)
        .filter(payload => !payload.retentionEnabled || !payload.retentionDuration);

      expect(faulty).toEqual([]);
    });

    it('n\'active jamais la suppression automatique', () => {
      const auto = COMMUNE_CATEGORIES
        .map(toCategoryPayload)
        .filter(payload => payload.expiryAction !== 'notify');

      expect(auto).toEqual([]);
    });

    it('utilise des noms et des codes uniques', () => {
      const names = COMMUNE_CATEGORIES.map(c => c.name.toLowerCase());
      const codes = COMMUNE_CATEGORIES.map(c => c.code);
      expect(new Set(names).size).toBe(names.length);
      expect(new Set(codes).size).toBe(codes.length);
    });
  });

  describe('Import', () => {
    it('est réservé aux administrateurs', async () => {
      const res = await request(app)
        .post('/api/categories/import-referential')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({});

      expect(res.status).toBe(403);
      expect(await Category.countDocuments()).toBe(0);
    });

    it('crée l\'ensemble du référentiel sur une base vierge', async () => {
      const res = await request(app)
        .post('/api/categories/import-referential')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.data.created).toHaveLength(COMMUNE_CATEGORIES.length);
      expect(await Category.countDocuments()).toBe(COMMUNE_CATEGORIES.length);

      const etatCivil = await Category.findOne({ name: "Registres d'état civil" });
      expect(etatCivil.retentionEnabled).toBe(false);
      expect(etatCivil.sortFinal).toBe('C');

      const paie = await Category.findOne({ name: 'Bulletins de paie' });
      expect(paie.retentionDuration).toBe(5);
      expect(paie.retentionUnit).toBe('years');
      expect(paie.expiryAction).toBe('notify');
    });

    it('peut se limiter à certains domaines', async () => {
      const res = await request(app)
        .post('/api/categories/import-referential')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ domains: ['Élections'] });

      expect(res.status).toBe(200);
      const expected = COMMUNE_CATEGORIES.filter(c => c.domain === 'Élections').length;
      expect(await Category.countDocuments()).toBe(expected);
    });

    it('est idempotent : un second import ne crée aucun doublon', async () => {
      await request(app).post('/api/categories/import-referential')
        .set('Authorization', `Bearer ${adminToken}`).send({});
      const res = await request(app).post('/api/categories/import-referential')
        .set('Authorization', `Bearer ${adminToken}`).send({});

      expect(res.body.data.created).toHaveLength(0);
      expect(res.body.data.skipped).toHaveLength(COMMUNE_CATEGORIES.length);
      expect(await Category.countDocuments()).toBe(COMMUNE_CATEGORIES.length);
    });

    it('ignore une catégorie existante sans toucher à sa durée', async () => {
      await Category.create({
        name: 'Facture',
        retentionEnabled: true,
        retentionDuration: 3,
        retentionUnit: 'years'
      });

      await request(app).post('/api/categories/import-referential')
        .set('Authorization', `Bearer ${adminToken}`).send({});

      const facture = await Category.findOne({ name: 'Facture' });
      expect(facture.retentionDuration).toBe(3);
    });

    it('aligne les durées existantes quand updateExisting est demandé, avec effet rétroactif', async () => {
      // Facture conservée 3 ans, avec un courrier reçu il y a 4 ans : conforme aujourd'hui
      const category = await Category.create({
        name: 'Facture',
        retentionEnabled: true,
        retentionDuration: 20,
        retentionUnit: 'years',
        retentionStartFrom: 'receivedDate'
      });
      await Subject.create({ name: 'Facture EDF', categoryRef: category._id });
      const receivedDate = new Date();
      receivedDate.setFullYear(receivedDate.getFullYear() - 12);
      await createMail({ sender: contact, service, recipient: agent, subject: 'Facture EDF', receivedDate });

      await scanRetention({ notify: false });
      expect((await RetentionAlert.findOne({})).status).toBe(RETENTION_ALERT_STATUS.UPCOMING);

      // Le référentiel ramène la facture à 10 ans : le courrier bascule en « à supprimer »
      const res = await request(app)
        .post('/api/categories/import-referential')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ updateExisting: true });

      expect(res.status).toBe(200);
      expect(res.body.data.updated).toContain('Facture');
      expect(res.body.data.newlyExpired).toBe(1);

      const facture = await Category.findById(category._id);
      expect(facture.retentionDuration).toBe(10);
      expect((await RetentionAlert.findOne({})).status).toBe(RETENTION_ALERT_STATUS.EXPIRED);
    });
  });

  describe('Aperçu', () => {
    it('signale les catégories déjà présentes', async () => {
      await Category.create({ name: 'facture' }); // casse différente

      const res = await request(app)
        .get('/api/categories/referential')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.entries).toHaveLength(COMMUNE_CATEGORIES.length);
      expect(res.body.data.existing).toBe(1);

      const facture = res.body.data.entries.find(e => e.name === 'Facture');
      expect(facture.alreadyExists).toBe(true);
    });

    it('est refusé aux non-administrateurs', async () => {
      const res = await request(app)
        .get('/api/categories/referential')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(403);
    });
  });
});
