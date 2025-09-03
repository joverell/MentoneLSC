// Import the Firebase app and messaging scripts
importScripts('https://www.gstatic.com/firebasejs/9.1.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.1.1/firebase-messaging-compat.js');

// This config is safe to be public
const firebaseConfig = {
  apiKey: "AIzaSyDgvrCV5dZDz38RcTEjLimuptSjKzqHIG0",
  authDomain: "mentonelsc-d3fae.firebaseapp.com",
  projectId: "mentonelsc-d3fae",
  storageBucket: "mentonelsc-d3fae.firebasestorage.app",
  messagingSenderId: "363497654814",
  appId: "1:363497654814:web:907d8d6af3886b2d07fc0f",
  measurementId: "G-9LD70EPRP7"
};

// Initialize the Firebase app in the service worker
firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    '[firebase-messaging-sw.js] Received background message ',
    payload
  );

  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192x192.png', // You should have an icon in your public folder
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
