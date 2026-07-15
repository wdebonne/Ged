import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { connectTestDb, disconnectTestDb } from './helpers/db.js';
import { createGroup, createUser, tokenFor } from './helpers/fixtures.js';

describe('Authentification (locale + middleware JWT)', () => {
  let userGroup;
  let user;
  let inactiveUser;

  beforeAll(async () => {
    await connectTestDb();
    userGroup = await createGroup('Utilisateur');
    user = await createUser({ group: userGroup, username: 'jdupont', password: 'Password1' });
    inactiveUser = await createUser({ group: userGroup, username: 'inactif', password: 'Password1', isActive: false });
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  describe('POST /api/auth/login', () => {
    it('connecte un utilisateur local avec les bons identifiants', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'jdupont', password: 'Password1' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeTruthy();
      expect(res.body.data.refreshToken).toBeTruthy();
      expect(res.body.data.user.username).toBe('jdupont');
      expect(res.body.data.user.group.name).toBe('Utilisateur');
    });

    it('refuse un mauvais mot de passe', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'jdupont', password: 'MauvaisMdp1' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('refuse un utilisateur inconnu', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'fantome', password: 'Password1' });

      expect(res.status).toBe(401);
    });

    it('refuse un compte désactivé même avec le bon mot de passe', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'inactif', password: 'Password1' });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/désactivé/i);
    });

    it('valide la présence du nom d’utilisateur et du mot de passe', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: '', password: '' });

      expect(res.status).toBe(400);
    });
  });

  describe('Middleware authenticate', () => {
    it('refuse une requête sans token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('refuse un token invalide', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer pas-un-vrai-token');
      expect(res.status).toBe(401);
    });

    it('accepte un token valide et renvoie l’utilisateur', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokenFor(user)}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.username).toBe('jdupont');
    });

    it('refuse le token d’un compte désactivé', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokenFor(inactiveUser)}`);

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('échange un refresh token valide contre un nouveau couple de tokens', async () => {
      const login = await request(app)
        .post('/api/auth/login')
        .send({ username: 'jdupont', password: 'Password1' });

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: login.body.data.refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeTruthy();
    });

    it('refuse un token d’accès utilisé comme refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: tokenFor(user) });

      expect(res.status).toBe(401);
    });
  });
});
