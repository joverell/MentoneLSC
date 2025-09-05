// tests/auth.test.js

// This test file is designed to verify the fix for the custom claims logic in the login API.
// It requires a Firebase testing environment with emulators for Auth and Firestore.
// Since setting up emulators is not feasible in this environment, this file outlines the test structure and logic.

// Mocking dependencies
jest.mock('../src/firebase-admin', () => ({
  adminAuth: {
    verifyIdToken: jest.fn(),
    getUser: jest.fn(),
    setCustomUserClaims: jest.fn(),
  },
  adminDb: {
    collection: jest.fn(),
  },
}));

// The handler for the login API route
import loginHandler from '../pages/api/auth/login';
import { adminAuth, adminDb } from '../src/firebase-admin';

describe('Login API - Custom Claims', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  test('should update custom claims with the latest roles from Firestore', async () => {
    // 1. Setup the test case
    const idToken = 'test-id-token';
    const uid = 'test-uid';
    const email = 'test@example.com';
    const initialRoles = ['Member'];
    const updatedRoles = ['Member', 'Paddler'];

    // Mock the Firebase Admin SDK functions
    adminAuth.verifyIdToken.mockResolvedValue({ uid, email });
    adminAuth.getUser.mockResolvedValue({
      uid,
      email,
      customClaims: { roles: initialRoles }, // Old roles in custom claims
    });

    const userDocMock = {
      exists: true,
      data: () => ({
        name: 'Test User',
        email,
        roles: updatedRoles, // Updated roles in Firestore
      }),
    };
    const docMock = { get: jest.fn().mockResolvedValue(userDocMock) };
    const collectionMock = { doc: jest.fn().mockReturnValue(docMock) };
    adminDb.collection.mockReturnValue(collectionMock);


    // Mock the request and response objects
    const req = {
      method: 'POST',
      body: { idToken },
    };
    const res = {
      status: jest.fn(() => res),
      json: jest.fn(),
      setHeader: jest.fn(),
    };

    // 2. Execute the API handler
    await loginHandler(req, res);

    // 3. Assert the results
    // Check that setCustomUserClaims was called with the updated roles
    expect(adminAuth.setCustomUserClaims).toHaveBeenCalledWith(uid, {
      roles: updatedRoles,
    });

    // Check that the response contains the updated roles
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        roles: updatedRoles,
      })
    );
  });
});
