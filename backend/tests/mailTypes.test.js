import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';

// Neutralise les effets de bord (emails, notifications in-app, registre Excel)
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
vi.mock('../src/services/notification.service.js', stubModule(vi));
vi.mock('../src/services/excel.service.js', stubModule(vi));

import app from '../src/app.js';
import { connectTestDb, disconnectTestDb, clearDatabase } from './helpers/db.js';
import { createGroup, createService, createUser, createContact, createMail, tokenFor } from './helpers/fixtures.js';
import { MailType, Mail } from '../src/models/index.js';
import { migrateMailTypes } from '../src/scripts/migrate-mailTypes.js';

describe('Types de document', () => {
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
    admin = await createUser({ group: adminGroup, username: 'admin.types' });
    agent = await createUser({ group: userGroup, services: [service], username: 'agent.types' });
    adminToken = tokenFor(admin);
    agentToken = tokenFor(agent);
  });

  describe('Référentiel par défaut', () => {
    it('crée les types au premier démarrage, avec « Courrier » par défaut', async () => {
      await migrateMailTypes();

      const types = await MailType.find({});
      expect(types.length).toBeGreaterThan(0);

      const defaults = types.filter(t => t.isDefault);
      expect(defaults).toHaveLength(1);
      expect(defaults[0].name).toBe('Courrier');

      const names = types.map(t => t.name);
      expect(names).toEqual(expect.arrayContaining(['Courrier', 'Email', 'Document', 'Note interne']));
    });

    it('est idempotent : rejouer la migration ne duplique rien', async () => {
      await migrateMailTypes();
      const first = await MailType.countDocuments();
      await migrateMailTypes();
      expect(await MailType.countDocuments()).toBe(first);
    });

    it('rattache au type par défaut les courriers enregistrés avant sa mise en place', async () => {
      const mail = await createMail({ sender: contact, service, recipient: agent });
      // Un courrier antérieur au champ `mailType` n'a pas du tout l'attribut
      await Mail.updateOne({ _id: mail._id }, { $unset: { mailType: '' } });

      await migrateMailTypes();

      const courrier = await MailType.findOne({ isDefault: true });
      const updated = await Mail.findById(mail._id);
      expect(String(updated.mailType)).toBe(String(courrier._id));
    });

    it('ne réattribue pas de type à un courrier laissé volontairement sans type', async () => {
      await migrateMailTypes();
      const mail = await createMail({ sender: contact, service, recipient: agent, mailType: null });

      // Un redémarrage ultérieur ne doit pas défaire le choix « aucun type »
      await migrateMailTypes();

      expect((await Mail.findById(mail._id)).mailType).toBeNull();
    });
  });

  describe('Contrôle d’accès', () => {
    it('laisse un simple utilisateur lire les types (choix à l’enregistrement)', async () => {
      await migrateMailTypes();

      const res = await request(app)
        .get('/api/mail-types/options')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('refuse la création, la modification et la suppression à un non-administrateur', async () => {
      const type = await MailType.create({ name: 'Provisoire' });

      const created = await request(app)
        .post('/api/mail-types')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ name: 'Note de service' });
      expect(created.status).toBe(403);

      const updated = await request(app)
        .put(`/api/mail-types/${type._id}`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ name: 'Autre nom' });
      expect(updated.status).toBe(403);

      const deleted = await request(app)
        .delete(`/api/mail-types/${type._id}`)
        .set('Authorization', `Bearer ${agentToken}`);
      expect(deleted.status).toBe(403);
    });
  });

  describe('Administration du référentiel', () => {
    it('crée un type et refuse un doublon de nom (casse ignorée)', async () => {
      const res = await request(app)
        .post('/api/mail-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Note interne', code: 'note', color: '#F59E0B' });

      expect(res.status).toBe(201);
      expect(res.body.data.code).toBe('NOTE');

      const duplicate = await request(app)
        .post('/api/mail-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'note INTERNE' });

      expect(duplicate.status).toBe(400);
    });

    it('n’autorise qu’un seul type par défaut à la fois', async () => {
      await migrateMailTypes();
      const email = await MailType.findOne({ name: 'Email' });

      const res = await request(app)
        .put(`/api/mail-types/${email._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Email', isDefault: true, isActive: true });

      expect(res.status).toBe(200);

      const defaults = await MailType.find({ isDefault: true });
      expect(defaults).toHaveLength(1);
      expect(defaults[0].name).toBe('Email');
    });

    it('retire le statut « par défaut » d’un type désactivé', async () => {
      await migrateMailTypes();
      const courrier = await MailType.findOne({ isDefault: true });

      await request(app)
        .put(`/api/mail-types/${courrier._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: courrier.name, isDefault: true, isActive: false });

      const reloaded = await MailType.findById(courrier._id);
      expect(reloaded.isActive).toBe(false);
      expect(reloaded.isDefault).toBe(false);
    });

    it('protège la suppression d’un type utilisé, puis détache les courriers si forcée', async () => {
      const type = await MailType.create({ name: 'Recommandé' });
      const mail = await createMail({ sender: contact, service, recipient: agent, mailType: type._id });

      const blocked = await request(app)
        .delete(`/api/mail-types/${type._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(blocked.status).toBe(409);
      expect(blocked.body.data.linkedMails).toBe(1);

      const forced = await request(app)
        .delete(`/api/mail-types/${type._id}?force=true`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(forced.status).toBe(200);

      // Le courrier survit à la suppression du type, sans type
      const survivor = await Mail.findById(mail._id);
      expect(survivor).toBeTruthy();
      expect(survivor.mailType).toBeNull();
    });

    it('compte les courriers rattachés à chaque type', async () => {
      const type = await MailType.create({ name: 'Facture' });
      await createMail({ sender: contact, service, recipient: agent, mailType: type._id });
      await createMail({ sender: contact, service, recipient: agent, mailType: type._id });

      const res = await request(app)
        .get('/api/mail-types')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.find(t => t.name === 'Facture').mailCount).toBe(2);
    });
  });

  describe('Type appliqué à l’enregistrement d’un courrier', () => {
    it('filtre la liste des courriers par type, et isole ceux qui n’en ont pas', async () => {
      const email = await MailType.create({ name: 'Email' });
      const note = await MailType.create({ name: 'Note interne' });

      await createMail({ sender: contact, service, recipient: agent, subject: 'Par email', mailType: email._id });
      await createMail({ sender: contact, service, recipient: agent, subject: 'En note', mailType: note._id });
      await createMail({ sender: contact, service, recipient: agent, subject: 'Sans type' });

      const byType = await request(app)
        .get(`/api/mails?mailType=${email._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(byType.status).toBe(200);
      expect(byType.body.data.mails.map(m => m.subject)).toEqual(['Par email']);
      expect(byType.body.data.mails[0].mailType.name).toBe('Email');

      const withoutType = await request(app)
        .get('/api/mails?mailType=none')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(withoutType.body.data.mails.map(m => m.subject)).toEqual(['Sans type']);
    });
  });
});
