import jwt from 'jsonwebtoken';
import { User, Group, Service, Contact, Mail, DEFAULT_PERMISSIONS } from '../../src/models/index.js';

// Crée un groupe ; sans `permissions`, reprend les permissions par défaut du rôle
export async function createGroup(name, permissions) {
  return Group.create({
    name,
    permissions: permissions ?? DEFAULT_PERMISSIONS[name] ?? []
  });
}

export async function createService(name = 'Service Test', code = 'TST') {
  return Service.create({ name, code });
}

let userSeq = 0;

export async function createUser({
  group,
  services = [],
  username,
  password = 'Password1',
  isActive = true,
  firstName = 'Test',
  lastName = 'Utilisateur'
} = {}) {
  userSeq += 1;
  const name = username || `user${userSeq}`;
  return User.create({
    username: name,
    email: `${name}@test.local`,
    password,
    firstName,
    lastName,
    group: group._id,
    services: services.map(s => s._id),
    isActive
  });
}

// Token JWT tel que délivré par POST /api/auth/login (payload { userId })
export function tokenFor(user) {
  return jwt.sign({ userId: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

export async function createContact(name = 'Mairie de Test') {
  return Contact.create({ name, isActive: true });
}

export async function createMail({ sender, service, recipient, importedBy, ...rest }) {
  return Mail.create({
    subject: 'Objet de test',
    sender: sender._id,
    senderName: sender.name,
    filePath: 'courriers/test.pdf',
    fileName: 'test.pdf',
    service: service._id,
    recipient: recipient._id,
    receivedDate: new Date(),
    importedBy: (importedBy || recipient)._id,
    ...rest
  });
}

// PDF minimal valide : suffit aux magic bytes (%PDF) et au filtre mimetype
export const MINI_PDF = Buffer.from(
  '%PDF-1.4\n' +
  '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
  '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n' +
  '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n' +
  'trailer\n<< /Size 4 /Root 1 0 R >>\n' +
  '%%EOF\n'
);
