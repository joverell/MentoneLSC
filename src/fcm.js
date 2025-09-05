import { getMessaging, getToken } from 'firebase/messaging';
import { app } from './firebase'; // Assuming your firebase init is in src/firebase.js
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from './firebase';

export const getFcmToken = async () => {
  try {
    const messaging = getMessaging(app);
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      console.log('Notification permission granted.');
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      });
      console.log('FCM Token:', token);
      return token;
    } else {
      console.log('Unable to get permission to notify.');
      return null;
    }
  } catch (error) {
    console.error('An error occurred while retrieving token. ', error);
    return null;
  }
};

export const saveFcmToken = async (userId, token) => {
  if (!userId || !token) return;

  try {
    const userDocRef = doc(db, 'users', userId);
    // Add the token to an array of tokens for the user
    await updateDoc(userDocRef, {
      fcmTokens: arrayUnion(token),
    });
    console.log('FCM token saved for user:', userId);
  } catch (error) {
    console.error('Error saving FCM token:', error);
  }
};

export const removeFcmToken = async (userId, token) => {
    if (!userId || !token) return;

    try {
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, {
            fcmTokens: arrayRemove(token)
        });
        console.log('FCM token removed for user:', userId);
    } catch (error) {
        console.error('Error removing FCM token:', error);
    }
};
