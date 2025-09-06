// tests/rsvp.test.js

import { adminAuth, adminDb } from '../src/firebase-admin';
import rsvpHandler from '../pages/api/events/[id]/rsvp.js';

// Mocking dependencies
jest.mock('../src/firebase-admin', () => ({
  adminAuth: {
    verifyIdToken: jest.fn(),
  },
  adminDb: {
    collection: jest.fn(),
  },
}));

describe('RSVP API', () => {
  let req, res;
  const eventId = 'test-event-id';
  const userId = 'test-user-id';
  const token = 'test-token';

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      method: 'POST',
      query: { id: eventId },
      headers: {
        authorization: `Bearer ${token}`,
      },
      body: {
        status: 'Yes',
        comment: 'I will be there',
        adultGuests: 1,
        kidGuests: 0,
      },
    };

    res = {
      status: jest.fn(() => res),
      json: jest.fn(),
      setHeader: jest.fn(),
      end: jest.fn(),
    };
  });

  test('should successfully RSVP a user', async () => {
    adminAuth.verifyIdToken.mockResolvedValue({ uid: userId });

    const set = jest.fn();
    const doc = jest.fn(() => ({ set }));
    const collection = jest.fn(() => ({ doc }));

    // Mock for event existence check
    const eventDocRef = { get: jest.fn().mockResolvedValue({ exists: () => true }) }; // Corrected mock
    adminDb.collection.mockImplementation((name) => {
        if (name === 'events') {
            return { doc: jest.fn().mockReturnValue({ ...eventDocRef, collection }) };
        }
        return { doc };
    });

    await rsvpHandler(req, res);

    expect(adminAuth.verifyIdToken).toHaveBeenCalledWith(token);
    expect(adminDb.collection).toHaveBeenCalledWith('events');
    expect(collection).toHaveBeenCalledWith('rsvps');
    expect(doc).toHaveBeenCalledWith(userId);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'Yes',
        comment: 'I will be there',
        adultGuests: 1,
        kidGuests: 0,
      }),
      { merge: true }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'RSVP submitted successfully.' });
  });

  test('should return 401 if no token is provided', async () => {
    req.headers.authorization = '';
    await rsvpHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Missing or invalid authorization token' });
  });

  test('should return 401 if token is invalid', async () => {
    const error = new Error('Invalid token');
    error.code = 'auth/argument-error';
    adminAuth.verifyIdToken.mockRejectedValue(error);
    await rsvpHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Authentication error: ' + error.message });
  });

  test('should return 405 if method is not POST', async () => {
    req.method = 'GET';
    await rsvpHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.end).toHaveBeenCalledWith('Method GET Not Allowed');
  });

  test('should return 404 if event does not exist', async () => {
    adminAuth.verifyIdToken.mockResolvedValue({ uid: userId });
    const eventDocRef = { get: jest.fn().mockResolvedValue({ exists: () => false }) }; // Corrected mock
    adminDb.collection.mockReturnValue({ doc: jest.fn().mockReturnValue(eventDocRef) });

    await rsvpHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Event not found.' });
  });
});
