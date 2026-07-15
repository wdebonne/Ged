import fs from 'fs';
import os from 'os';
import path from 'path';

// Chargé par vitest (setupFiles) AVANT l'import des fichiers de test :
// upload.middleware.js lit UPLOAD_PATH au chargement du module, et
// dotenv.config() dans app.js n'écrase pas les variables déjà définies.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'secret-jwt-de-test';
process.env.LDAP_ENABLED = 'false';
process.env.KERBEROS_ENABLED = 'false';
process.env.IMAP_ENABLED = 'false';
process.env.UPLOAD_PATH = fs.mkdtempSync(path.join(os.tmpdir(), 'ged-test-uploads-'));
