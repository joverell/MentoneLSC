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
    // Construct the service account object from individual environment variables
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL, // Note: Typo in original .env.local script
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
  }
} catch (error) {
  console.error('Firebase admin initialization error', error);
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export const adminStorage = admin.storage();
