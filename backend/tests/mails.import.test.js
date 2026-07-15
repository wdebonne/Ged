import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';

// L'OCR réel (pdf-parse + tesseract) est trop lourd pour un test API :
// on le remplace par un stub qui renvoie un texte déterministe
vi.mock('../src/services/ocr.service.js', () => ({
  isOCRAvailable: () => false,
  getOCRLanguages: () => ['fra'],
  extractTextFromPDF: vi.fn().mockResolvedValue('contenu OCR simulé pour les tests'),
  extractTextFromImage: vi.fn().mockResolvedValue(''),
  processOCRQueue: vi.fn().mockResolvedValue([])
}));

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
import { PendingMail, Mail, Contact } from '../src/models/index.js';
import { connectTestDb, disconnectTestDb } from './helpers/db.js';
import { createGroup, createService, createUser, tokenFor, MINI_PDF } from './helpers/fixtures.js';

describe('Import de courriers (upload + import)', () => {
  let admin, agent;
  let service;

  beforeAll(async () => {
    await connectTestDb();

    const adminGroup = await createGroup('Administrateur');
    const userGroup = await createGroup('Utilisateur');

    service = await createService('Secrétariat', 'SEC');
    admin = await createUser({ group: adminGroup, username: 'admin.import' });
    agent = await createUser({ group: userGroup, services: [service], username: 'agent.import' });
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  describe('Contrôle d’accès (groupes Administrateur / Archiviste uniquement)', () => {
    it('refuse l’upload en attente à un simple utilisateur', async () => {
      const res = await request(app)
        .post('/api/mails/pending/upload')
        .set('Authorization', `Bearer ${tokenFor(agent)}`)
        .attach('files', MINI_PDF, { filename: 'courrier.pdf', contentType: 'application/pdf' });

      expect(res.status).toBe(403);
    });

    it('refuse la liste des courriers en attente à un simple utilisateur', async () => {
      const res = await request(app)
        .get('/api/mails/pending')
        .set('Authorization', `Bearer ${tokenFor(agent)}`);

      expect(res.status).toBe(403);
    });

    it('refuse l’import à un simple utilisateur', async () => {
      const res = await request(app)
        .post('/api/mails/import')
        .set('Authorization', `Bearer ${tokenFor(agent)}`)
        .send({});

      expect(res.status).toBe(403);
    });
  });

  describe('Flux complet upload → import', () => {
    let pendingId;

    it('uploade un PDF en attente (avec OCR)', async () => {
      const res = await request(app)
        .post('/api/mails/pending/upload')
        .set('Authorization', `Bearer ${tokenFor(admin)}`)
        .attach('files', MINI_PDF, { filename: 'courrier.pdf', contentType: 'application/pdf' });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveLength(1);
      pendingId = res.body.data[0]._id;

      const pending = await PendingMail.findById(pendingId);
      expect(pending).toBeTruthy();
      expect(pending.ocrContent).toBe('contenu OCR simulé pour les tests');
      expect(fs.existsSync(pending.filePath)).toBe(true);
    });

    it('rejette un import incomplet (validation express-validator)', async () => {
      const res = await request(app)
        .post('/api/mails/import')
        .set('Authorization', `Bearer ${tokenFor(admin)}`)
        .send({ pendingMailId: pendingId });

      expect(res.status).toBe(400);
      expect(res.body.errors.length).toBeGreaterThan(0);
    });

    it('importe le courrier en attente : Mail créé, PendingMail supprimé, fichier déplacé', async () => {
      const res = await request(app)
        .post('/api/mails/import')
        .set('Authorization', `Bearer ${tokenFor(admin)}`)
        .send({
          pendingMailId: pendingId,
          subject: 'Demande de subvention',
          senderId: 'Association des Riverains',
          serviceId: service._id.toString(),
          recipientId: agent._id.toString(),
          priority: 'high'
        });

      expect(res.status).toBe(201);
      const mail = res.body.data;
      expect(mail.subject).toBe('Demande de subvention');
      expect(mail.recipient._id).toBe(agent._id.toString());
      expect(mail.ocrContent).toBe('contenu OCR simulé pour les tests');

      // L'expéditeur inconnu a été créé comme contact
      const sender = await Contact.findOne({ name: 'Association des Riverains' });
      expect(sender).toBeTruthy();

      // Le courrier en attente a été consommé
      expect(await PendingMail.findById(pendingId)).toBeNull();

      // Le fichier a été déplacé de pending/ vers courriers/
      const stored = await Mail.findById(mail._id);
      expect(stored.filePath.startsWith('courriers/')).toBe(true);
      expect(fs.existsSync(path.join(process.env.UPLOAD_PATH, stored.filePath))).toBe(true);
    });

    it('rend le courrier importé visible par son destinataire', async () => {
      const mail = await Mail.findOne({ subject: 'Demande de subvention' });
      const res = await request(app)
        .get(`/api/mails/${mail._id}`)
        .set('Authorization', `Bearer ${tokenFor(agent)}`);

      expect(res.status).toBe(200);
    });

    it('renvoie 404 pour un import dont le courrier en attente n’existe plus', async () => {
      const res = await request(app)
        .post('/api/mails/import')
        .set('Authorization', `Bearer ${tokenFor(admin)}`)
        .send({
          pendingMailId: pendingId,
          subject: 'Doublon',
          senderId: 'Association des Riverains',
          serviceId: service._id.toString(),
          recipientId: agent._id.toString()
        });

      expect(res.status).toBe(404);
    });
  });

  describe('Filtres d’upload', () => {
    it('rejette un fichier qui n’est pas un PDF', async () => {
      const res = await request(app)
        .post('/api/mails/pending/upload')
        .set('Authorization', `Bearer ${tokenFor(admin)}`)
        .attach('files', Buffer.from('bonjour'), { filename: 'note.txt', contentType: 'text/plain' });

      expect(res.status).toBe(400);
    });
  });
});
