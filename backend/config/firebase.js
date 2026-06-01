import admin from 'firebase-admin';

let serviceAccount;

// THE PRODUCTION FIX: Look for the environment variable first!
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    // Parse the environment variable string back into a clean JSON object
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (error) {
    console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT env variable:", error);
  }
} else {
  // Local Development Fallback: look for the physical file only when working on your machine
  try {
    serviceAccount = await import('../serviceAccountKey.json', { assert: { type: 'json' } });
    serviceAccount = serviceAccount.default;
  } catch (error) {
    console.warn("⚠️ Local serviceAccountKey.json not found. Make sure environment variables are set.");
  }
}

if (!admin.apps.length && serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log("🔥 Firebase Admin SDK initialized successfully");
} else if (!serviceAccount) {
  console.error("❌ Firebase could not be initialized: Missing credentials.");
}

export { admin }; 
export const db = admin.firestore();
export const auth = admin.auth();