import admin from 'firebase-admin';

// Check for required environment variables
if (
  !process.env.FIREBASE_PROJECT_ID ||
  !process.env.FIREBASE_CLIENT_EMAIL ||
  !process.env.FIREBASE_PRIVATE_KEY ||
  !process.env.FIREBASE_STORAGE_BUCKET
) {
  throw new Error(
    'CRITICAL: One or more Firebase Admin environment variables are not set. The application cannot start.'
  );
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
    console.log(`Initializing Firebase Admin with bucket: ${process.env.FIREBASE_STORAGE_BUCKET}`);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
  } catch (error) {
    console.error('Firebase Admin Initialization Error:', error);
    throw new Error('Failed to initialize Firebase Admin SDK. Check your service account credentials.');
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export const adminStorage = admin.storage();
