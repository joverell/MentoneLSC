// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDgvrCV5dZDz38RcTEjLimuptSjKzqHIG0",
  authDomain: "mentonelsc-d3fae.firebaseapp.com",
  projectId: "mentonelsc-d3fae",
  storageBucket: "mentonelsc-d3fae.firebasestorage.app",
  messagingSenderId: "363497654814",
  appId: "1:363497654814:web:907d8d6af3886b2d07fc0f",
  measurementId: "G-9LD70EPRP7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
