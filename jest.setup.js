// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Used for __tests__/testing-library.js
// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import 'whatwg-fetch';
import { initializeApp } from 'firebase/app';

// Mock environment variables
const firebaseConfig = {
  apiKey: "test-api-key",
  authDomain: "test-project.firebaseapp.com",
  projectId: "test-project",
  storageBucket: "test-project.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:test-app-id",
};

// Initialize Firebase for tests
initializeApp(firebaseConfig);

jest.mock('firebase/auth', () => ({
    getAuth: jest.fn(() => ({
      currentUser: {
        uid: 'test-uid',
        getIdToken: () => Promise.resolve('test-token'),
      },
    })),
  }));
