import admin from 'firebase-admin';

// 1. Read the environment variable
const serviceAccountBase64 = process.env.FIRESTORE_SERVICE_ACCOUNT_BASE64;

// 2. Add a robust check WITH a clear, custom error message
if (!serviceAccountBase64) {
  throw new Error(
    'CRITICAL: FIRESTORE_SERVICE_ACCOUNT_BASE64 environment variable is not set. The application cannot start.'
  );
}

try {
  // 3. Decode the Base64 string and parse it as JSON
  const serviceAccountJson = Buffer.from(serviceAccountBase64, 'base64').toString('utf-8');
  const serviceAccount = JSON.parse(serviceAccountJson);

  // 4. Initialize Firebase Admin, preventing re-initialization
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
  }
} catch (error) {
  // 5. Add a catch block to provide more context if the key is invalid
  console.error('Firebase Admin Initialization Error:', error);
  throw new Error('Failed to initialize Firebase Admin SDK. The service account key may be invalid or incorrectly encoded.');
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export const adminStorage = admin.storage();
