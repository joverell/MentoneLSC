// tests/auth.test.js

// This test file is designed to verify the fix for the custom claims logic in the login API.
// It requires a Firebase testing environment with emulators for Auth and Firestore.
// Since setting up emulators is not feasible in this environment, this file outlines the test structure and logic.

// Mocking dependencies
// In a real test, we would use libraries like 'jest' to mock these modules.
const mockAdminAuth = {
  verifyIdToken: jest.fn(),
  getUser: jest.fn(),
  setCustomUserClaims: jest.fn(),
};

const mockAdminDb = {
  collection: jest.fn(() => ({
    doc: jest.fn(() => ({
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
    })),
  })),
};

jest.mock('../src/firebase-admin', () => ({
  adminAuth: mockAdminAuth,
  adminDb: mockAdminDb,
}));

// The handler for the login API route
import loginHandler from '../pages/api/auth/login';

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
    mockAdminAuth.verifyIdToken.mockResolvedValue({ uid, email });
    mockAdminAuth.getUser.mockResolvedValue({
      uid,
      email,
      customClaims: { roles: initialRoles }, // Old roles in custom claims
    });
    mockAdminDb.collection().doc().get.mockResolvedValue({
      exists: true,
      data: () => ({
        name: 'Test User',
        email,
        roles: updatedRoles, // Updated roles in Firestore
      }),
    });

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
    expect(mockAdminAuth.setCustomUserClaims).toHaveBeenCalledWith(uid, {
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
