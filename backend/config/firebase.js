import dotenv from 'dotenv';
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env BEFORE reading process.env
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let serviceAccount;

// 1. Production / Render:
//    Read Firebase credentials from environment variable
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    console.log('✅ Firebase service account loaded from environment variable');
  } catch (error) {
    console.error(
      '❌ Failed to parse FIREBASE_SERVICE_ACCOUNT:',
      error.message
    );
  }
}

// 2. Local development:
//    backend/config/firebase.js
//    ../serviceAccountKey.json
//    = backend/serviceAccountKey.json
if (!serviceAccount) {
  try {
    const serviceAccountPath = path.join(
      __dirname,
      '../serviceAccountKey.json'
    );

    if (fs.existsSync(serviceAccountPath)) {
      serviceAccount = JSON.parse(
        fs.readFileSync(serviceAccountPath, 'utf8')
      );

      console.log('✅ Local serviceAccountKey.json loaded successfully');
    } else {
      console.warn(
        '⚠️ serviceAccountKey.json not found at:',
        serviceAccountPath
      );
    }
  } catch (error) {
    console.error(
      '❌ Failed to load local Firebase service account:',
      error.message
    );
  }
}

// Initialize Firebase
if (!admin.apps.length && serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  console.log('🔥 Firebase Admin SDK initialized successfully');
}

if (!serviceAccount) {
  throw new Error(
    '❌ Firebase could not be initialized. No credentials found.'
  );
}

export { admin };
export const db = admin.firestore();
export const auth = admin.auth();