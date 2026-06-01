import admin from 'firebase-admin'; // <-- THE FIX: Import the official Google package
import dotenv from 'dotenv';
import { createRequire } from 'module';

dotenv.config();

// Require the local JSON file securely
const require = createRequire(import.meta.url);
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Export the Firestore database instance
export const db = admin.firestore();
export { admin };