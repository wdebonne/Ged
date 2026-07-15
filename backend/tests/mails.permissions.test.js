import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';

// Neutralise les effets de bord (emails, notifications in-app, registre Excel) :
// chaque export du module devient un stub résolu. vi.hoisted car vi.mock est
// hissé en tête de module, avant toute déclaration classique.
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
import { connectTestDb, disconnectTestDb } from './helpers/db.js';
import { createGroup, createService, createUser, createContact, createMail, tokenFor } from './helpers/fixtures.js';

describe('Permissions et visibilité des courriers', () => {
  let serviceEau, serviceUrba;
  let admin, agentEau, agentUrba, superviseurUrba, sansPermission;
  let contact;
  let mailEau, mailUrba, mailUrba2;

  beforeAll(async () => {
    await connectTestDb();

    const adminGroup = await createGroup('Administrateur');
    const userGroup = await createGroup('Utilisateur');
    const supervisorGroup = await createGroup('Superviseur');
    const emptyGroup = await createGroup('Lecture seule', []);

    serviceEau = await createService('Service des Eaux', 'EAU');
    serviceUrba = await createService('Urbanisme', 'URB');

    admin = await createUser({ group: adminGroup, username: 'admin' });
    agentEau = await createUser({ group: userGroup, services: [serviceEau], username: 'agent.eau' });
    agentUrba = await createUser({ group: userGroup, services: [serviceUrba], username: 'agent.urba' });
    superviseurUrba = await createUser({ group: supervisorGroup, services: [serviceUrba], username: 'chef.urba' });
    sansPermission = await createUser({ group: emptyGroup, username: 'lecteur' });

    contact = await createContact('Préfecture');

    mailEau = await createMail({
      sender: contact,
      service: serviceEau,
      recipient: agentEau,
      subject: 'Rapport qualité eau potable',
      ocrContent: 'Analyse de la qualité des réseaux de distribution'
    });
    mailUrba = await createMail({
      sender: contact,
      service: serviceUrba,
      recipient: agentUrba,
      subject: 'Permis de construire 2026-042',
      ocrContent: 'Délibération du conseil municipal approuvée à l’unanimité'
    });
    mailUrba2 = await createMail({
      sender: contact,
      service: serviceUrba,
      recipient: admin,
      subject: 'Plan local d’urbanisme'
    });
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  describe('GET /api/mails (visibilité)', () => {
    it('un agent sans view_service_mails ne voit que ses propres courriers', async () => {
      const res = await request(app)
        .get('/api/mails')
        .set('Authorization', `Bearer ${tokenFor(agentEau)}`);

      expect(res.status).toBe(200);
      const ids = res.body.data.mails.map(m => m._id);
      expect(ids).toContain(mailEau._id.toString());
      expect(ids).not.toContain(mailUrba._id.toString());
      expect(ids).not.toContain(mailUrba2._id.toString());
    });

    it('un superviseur avec view_service_mails voit les courriers de son service', async () => {
      const res = await request(app)
        .get('/api/mails')
        .set('Authorization', `Bearer ${tokenFor(superviseurUrba)}`);

      expect(res.status).toBe(200);
      const ids = res.body.data.mails.map(m => m._id);
      expect(ids).toContain(mailUrba._id.toString());
      expect(ids).toContain(mailUrba2._id.toString());
      expect(ids).not.toContain(mailEau._id.toString());
    });

    it('un administrateur (view_all_mails) voit tous les courriers', async () => {
      const res = await request(app)
        .get('/api/mails')
        .set('Authorization', `Bearer ${tokenFor(admin)}`);

      expect(res.status).toBe(200);
      expect(res.body.data.pagination.total).toBe(3);
    });
  });

  describe('GET /api/mails/:id (contrôle d’accès)', () => {
    it('autorise le destinataire du courrier', async () => {
      const res = await request(app)
        .get(`/api/mails/${mailEau._id}`)
        .set('Authorization', `Bearer ${tokenFor(agentEau)}`);

      expect(res.status).toBe(200);
      expect(res.body.data.subject).toBe('Rapport qualité eau potable');
    });

    it('refuse un agent étranger au courrier (403)', async () => {
      const res = await request(app)
        .get(`/api/mails/${mailUrba._id}`)
        .set('Authorization', `Bearer ${tokenFor(agentEau)}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Recherche plein texte ($text sur ocrContent)', () => {
    it('trouve un courrier par un mot de son contenu OCR', async () => {
      const res = await request(app)
        .get('/api/mails')
        .query({ search: 'conseil' })
        .set('Authorization', `Bearer ${tokenFor(admin)}`);

      expect(res.status).toBe(200);
      const ids = res.body.data.mails.map(m => m._id);
      expect(ids).toContain(mailUrba._id.toString());
      expect(ids).not.toContain(mailEau._id.toString());
    });

    it('reste insensible à la casse via l’index texte', async () => {
      const res = await request(app)
        .get('/api/mails')
        .query({ search: 'CONSEIL' })
        .set('Authorization', `Bearer ${tokenFor(admin)}`);

      expect(res.status).toBe(200);
      expect(res.body.data.mails.map(m => m._id)).toContain(mailUrba._id.toString());
    });

    it('recherche toujours par sous-chaîne sur les champs courts (objet)', async () => {
      const res = await request(app)
        .get('/api/mails')
        .query({ search: 'construire' })
        .set('Authorization', `Bearer ${tokenFor(admin)}`);

      expect(res.status).toBe(200);
      const ids = res.body.data.mails.map(m => m._id);
      expect(ids).toContain(mailUrba._id.toString());
      expect(ids).not.toContain(mailUrba2._id.toString());
    });

    it('la recherche respecte la visibilité de l’utilisateur', async () => {
      const res = await request(app)
        .get('/api/mails')
        .query({ search: 'conseil' })
        .set('Authorization', `Bearer ${tokenFor(agentEau)}`);

      expect(res.status).toBe(200);
      expect(res.body.data.mails).toHaveLength(0);
    });
  });

  describe('Actions protégées', () => {
    it('refuse l’ajout de réponse sans la permission process_mails', async () => {
      const res = await request(app)
        .post(`/api/mails/${mailEau._id}/response`)
        .set('Authorization', `Bearer ${tokenFor(sansPermission)}`)
        .send({ type: 'email', content: 'Réponse test' });

      expect(res.status).toBe(403);
    });

    it('refuse la mise à la corbeille à un non-administrateur', async () => {
      const res = await request(app)
        .delete(`/api/mails/${mailEau._id}`)
        .set('Authorization', `Bearer ${tokenFor(agentEau)}`);

      expect(res.status).toBe(403);
    });

    it('autorise la mise à la corbeille à un administrateur (soft delete)', async () => {
      const trashed = await createMail({
        sender: contact,
        service: serviceEau,
        recipient: agentEau,
        subject: 'Courrier à supprimer'
      });

      const res = await request(app)
        .delete(`/api/mails/${trashed._id}`)
        .set('Authorization', `Bearer ${tokenFor(admin)}`)
        .send({ reason: 'doublon' });

      expect(res.status).toBe(200);

      // Le courrier en corbeille disparaît des lectures par défaut (plugin softDelete)
      const detail = await request(app)
        .get(`/api/mails/${trashed._id}`)
        .set('Authorization', `Bearer ${tokenFor(admin)}`);
      expect(detail.status).toBe(404);
    });

    it('refuse une action groupée à un utilisateur sans droits sur le courrier', async () => {
      const res = await request(app)
        .post('/api/mails/bulk')
        .set('Authorization', `Bearer ${tokenFor(sansPermission)}`)
        .send({ ids: [mailEau._id.toString()], action: 'tag', tags: ['urgent'] });

      expect(res.status).toBe(200);
      expect(res.body.data.done).toHaveLength(0);
      expect(res.body.data.skipped).toHaveLength(1);
      expect(res.body.data.skipped[0].reason).toMatch(/permission/i);
    });
  });
});
