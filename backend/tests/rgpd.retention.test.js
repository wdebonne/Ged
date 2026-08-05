import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';

// Neutralise les envois d'emails ; les notifications in-app restent réelles
// pour vérifier qu'un changement de durée alerte bien les administrateurs.
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
import {
  Category,
  Subject,
  Mail,
  RetentionAlert,
  Notification,
  Settings,
  RETENTION_ALERT_STATUS
} from '../src/models/index.js';
import { scanRetention } from '../src/services/retention.service.js';

const monthsAgo = (n) => {
  const date = new Date();
  date.setMonth(date.getMonth() - n);
  return date;
};

describe('Conservation RGPD par catégorie', () => {
  let admin, agent, adminToken, agentToken, service, contact;

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
    admin = await createUser({ group: adminGroup, username: 'admin.rgpd' });
    agent = await createUser({ group: userGroup, services: [service], username: 'agent.rgpd' });
    adminToken = tokenFor(admin);
    agentToken = tokenFor(agent);
  });

  // Crée une catégorie, l'objet qui la porte, et un courrier reçu il y a `receivedMonthsAgo` mois
  const seedDocument = async ({ retentionDuration = 3, receivedMonthsAgo = 24, subjectName = 'Facture EDF' } = {}) => {
    const category = await Category.create({
      name: 'Facture',
      retentionEnabled: true,
      retentionDuration,
      retentionUnit: 'years',
      retentionStartFrom: 'receivedDate',
      legalBasis: 'Test'
    });
    await Subject.create({ name: subjectName, category: category.name, categoryRef: category._id });
    const mail = await createMail({
      sender: contact,
      service,
      recipient: agent,
      subject: subjectName,
      receivedDate: monthsAgo(receivedMonthsAgo)
    });
    return { category, mail };
  };

  describe('Gestion des catégories', () => {
    it('refuse la création à un utilisateur non administrateur', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ name: 'Contrat' });

      expect(res.status).toBe(403);
      expect(await Category.countDocuments()).toBe(0);
    });

    it('permet à un administrateur de créer une catégorie avec sa durée légale', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Facture',
          code: 'FACT',
          retentionEnabled: true,
          retentionDuration: 3,
          retentionUnit: 'years',
          legalBasis: 'Art. L102 B LPF'
        });

      expect(res.status).toBe(201);
      const category = await Category.findOne({ name: 'Facture' });
      expect(category.retentionDuration).toBe(3);
      // La création trace déjà la durée initiale dans l'historique
      expect(category.retentionHistory).toHaveLength(1);
    });

    it('laisse la liste des catégories accessible en lecture aux non-administrateurs', async () => {
      await Category.create({ name: 'Contrat', isActive: true });
      const res = await request(app)
        .get('/api/categories/options')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('Calcul des échéances', () => {
    it('n\'alerte pas tant que la durée légale n\'est pas atteinte', async () => {
      await seedDocument({ retentionDuration: 3, receivedMonthsAgo: 24 });

      await scanRetention({ notify: false });

      const alert = await RetentionAlert.findOne({});
      expect(alert.status).toBe(RETENTION_ALERT_STATUS.UPCOMING);
    });

    it('signale les documents dont la durée légale est dépassée', async () => {
      await seedDocument({ retentionDuration: 3, receivedMonthsAgo: 48 });

      const result = await scanRetention({ notify: false });

      expect(result.expired).toBe(1);
      const alert = await RetentionAlert.findOne({});
      expect(alert.status).toBe(RETENTION_ALERT_STATUS.EXPIRED);
      expect(alert.categoryName).toBe('Facture');
    });

    it('ignore les documents dont la catégorie ne définit aucune durée', async () => {
      const category = await Category.create({ name: 'Information', retentionEnabled: false });
      await Subject.create({ name: 'Note interne', categoryRef: category._id });
      await createMail({ sender: contact, service, recipient: agent, subject: 'Note interne' });

      await scanRetention({ notify: false });

      expect(await RetentionAlert.countDocuments()).toBe(0);
    });
  });

  describe('Changement rétroactif de la durée', () => {
    it('rend immédiatement supprimables les anciens documents quand la durée est réduite', async () => {
      // Facture reçue il y a 2 ans, conservation 3 ans : conforme aujourd'hui
      const { category } = await seedDocument({ retentionDuration: 3, receivedMonthsAgo: 30 });
      await scanRetention({ notify: false });
      expect((await RetentionAlert.findOne({})).status).toBe(RETENTION_ALERT_STATUS.UPCOMING);

      // La durée légale passe à 2 ans : le document doit basculer en « à supprimer »
      const res = await request(app)
        .put(`/api/categories/${category._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Facture',
          retentionEnabled: true,
          retentionDuration: 2,
          retentionUnit: 'years',
          changeReason: 'Nouvelle durée légale'
        });

      expect(res.status).toBe(200);
      expect(res.body.impact.newlyExpired).toBe(1);
      expect((await RetentionAlert.findOne({})).status).toBe(RETENTION_ALERT_STATUS.EXPIRED);
    });

    it('alerte les administrateurs et journalise le changement de durée', async () => {
      const { category } = await seedDocument({ retentionDuration: 3, receivedMonthsAgo: 30 });
      await scanRetention({ notify: false });

      await request(app)
        .put(`/api/categories/${category._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Facture', retentionEnabled: true, retentionDuration: 2, retentionUnit: 'years' });

      const notifications = await Notification.find({ recipient: admin._id });
      expect(notifications.some(n => n.type === 'rgpd_retention_changed')).toBe(true);
      expect(notifications.some(n => n.type === 'rgpd_retention_expired')).toBe(true);

      // L'agent non administrateur ne reçoit aucune alerte RGPD
      expect(await Notification.countDocuments({ recipient: agent._id })).toBe(0);

      const updated = await Category.findById(category._id);
      const lastChange = updated.retentionHistory[updated.retentionHistory.length - 1];
      expect(lastChange.previousDuration).toBe(3);
      expect(lastChange.duration).toBe(2);
      expect(lastChange.newlyExpiredCount).toBe(1);
    });

    it('simule l\'impact d\'une durée sans rien modifier', async () => {
      const { category } = await seedDocument({ retentionDuration: 3, receivedMonthsAgo: 30 });
      await scanRetention({ notify: false });

      const res = await request(app)
        .post(`/api/categories/${category._id}/retention-preview`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ retentionDuration: 2, retentionUnit: 'years' });

      expect(res.status).toBe(200);
      expect(res.body.data.newlyExpiredCount).toBe(1);
      // La catégorie et l'alerte restent inchangées
      expect((await Category.findById(category._id)).retentionDuration).toBe(3);
      expect((await RetentionAlert.findOne({})).status).toBe(RETENTION_ALERT_STATUS.UPCOMING);
    });
  });

  describe('Suppression', () => {
    it('met le document en corbeille depuis la page de conformité', async () => {
      const { mail } = await seedDocument({ retentionDuration: 3, receivedMonthsAgo: 48 });
      await scanRetention({ notify: false });
      const alert = await RetentionAlert.findOne({});

      const res = await request(app)
        .post(`/api/rgpd/alerts/${alert._id}/delete`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const trashed = await Mail.findById(mail._id).setOptions({ withDeleted: true });
      expect(trashed.deletedAt).not.toBeNull();
      expect(trashed.deleteReason).toContain('RGPD');
      expect((await RetentionAlert.findById(alert._id)).status).toBe(RETENTION_ALERT_STATUS.DELETED);
    });

    it('supprime automatiquement quand la catégorie et le réglage global l\'autorisent', async () => {
      const { category, mail } = await seedDocument({ retentionDuration: 3, receivedMonthsAgo: 48 });
      category.expiryAction = 'auto_trash';
      await category.save();
      await Settings.setValue('rgpd_auto_delete_enabled', true, 'rgpd');

      const result = await scanRetention({ notify: false });

      expect(result.autoDeleted).toBe(1);
      const trashed = await Mail.findById(mail._id).setOptions({ withDeleted: true });
      expect(trashed.deletedAt).not.toBeNull();
    });

    it('ne supprime pas automatiquement tant que le réglage global est désactivé', async () => {
      const { category, mail } = await seedDocument({ retentionDuration: 3, receivedMonthsAgo: 48 });
      category.expiryAction = 'auto_trash';
      await category.save();

      const result = await scanRetention({ notify: false });

      expect(result.autoDeleted).toBe(0);
      expect((await Mail.findById(mail._id)).deletedAt).toBeNull();
    });

    it('interdit l\'accès à la conformité RGPD aux non-administrateurs', async () => {
      const res = await request(app)
        .get('/api/rgpd/overview')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Dérogation', () => {
    it('met l\'alerte en sommeil jusqu\'au terme accordé', async () => {
      await seedDocument({ retentionDuration: 3, receivedMonthsAgo: 48 });
      await scanRetention({ notify: false });
      const alert = await RetentionAlert.findOne({});

      await request(app)
        .post(`/api/rgpd/alerts/${alert._id}/exempt`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ days: 180, reason: 'Contentieux en cours' });

      const result = await scanRetention({ notify: false });

      expect(result.expired).toBe(0);
      expect((await RetentionAlert.findById(alert._id)).status).toBe(RETENTION_ALERT_STATUS.EXEMPTED);
    });
  });
});
