import admin from 'firebase-admin';

// Check for required environment variables
if (
  !process.env.FIREBASE_PROJECT_ID ||
  !process.env.FIREBASE_CLIENT_EMAIL ||
  !process.env.FIREBASE_PRIVATE_KEY ||
  !process.env.NEXT_PUBLIC_FIREBASE_CONFIG
) {
  throw new Error(
    'CRITICAL: One or more Firebase Admin environment variables are not set. The application cannot start.'
  );
}

// Parse the client-side config to get the storage bucket
const firebaseConfig = JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG);
const storageBucket = firebaseConfig.storageBucket;

if (!storageBucket) {
    throw new Error('CRITICAL: storageBucket is not defined in NEXT_PUBLIC_FIREBASE_CONFIG.');
}


// Check if the app is already initialized to prevent errors
if (!admin.apps.length) {
  // Construct the service account object from environment variables
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  };

  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: storageBucket,
    });
  } catch (error) {
    console.error('Firebase Admin Initialization Error:', error);
    throw new Error('Failed to initialize Firebase Admin SDK. Check your service account credentials.');
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export const adminStorage = admin.storage();
