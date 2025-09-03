import admin from 'firebase-admin';

// This is the server-side initialization for Firebase.
// It uses a "Service Account" which gives administrative access.
// IMPORTANT: You must create a service account in your Firebase project settings
// and set the credentials as an environment variable.

// 1. Go to your Firebase project settings > Service accounts.
// 2. Click "Generate new private key" and download the JSON file.
// 3. DO NOT commit this file to git. It's highly sensitive.
// 4. Set the contents of the JSON file as an environment variable.
//    For example, in a .env.local file:
//    FIREBASE_SERVICE_ACCOUNT_KEY='{ "type": "service_account", ... }'

try {
  if (!admin.apps.length) {
    // The new approach: parse the service account key from a single environment variable.
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
  }
} catch (error) {
  console.error('Firebase admin initialization error', error);
  // Optional: throw the error to halt execution if Firebase is essential
  // throw new Error("Firebase initialization failed: " + error.message);
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export const adminStorage = admin.storage();
