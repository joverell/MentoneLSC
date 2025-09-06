import handler from '../pages/api/chat/setup';
import { adminDb } from '../src/firebase-admin';

// Mock the firebase-admin module
jest.mock('../src/firebase-admin', () => ({
  adminDb: {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    get: jest.fn(),
    set: jest.fn(),
    add: jest.fn(),
  },
}));

// Mock the FieldValue
const mockServerTimestamp = jest.fn(() => 'mock-timestamp');
jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: () => mockServerTimestamp(),
  },
}));

describe('/api/chat/setup', () => {
  let req, res;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock request and response objects
    req = {
      method: 'POST',
      headers: {},
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
    };
  });

  it('should create the general chat if it does not exist', async () => {
    // Arrange: Mock that the document does not exist
    adminDb.get.mockResolvedValue({ exists: false });
    adminDb.set.mockResolvedValue({}); // Mock the set operation
    adminDb.collection('messages').add.mockResolvedValue({}); // Mock the add operation

    // Act: Call the handler
    await handler(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ message: 'General chat created successfully.' });
    expect(adminDb.collection).toHaveBeenCalledWith('chats');
    expect(adminDb.doc).toHaveBeenCalledWith('general');
    expect(adminDb.set).toHaveBeenCalledTimes(1);
    expect(adminDb.collection).toHaveBeenCalledWith('messages');
    expect(adminDb.add).toHaveBeenCalledTimes(1);
  });

  it('should not create the general chat if it already exists', async () => {
    // Arrange: Mock that the document exists
    adminDb.get.mockResolvedValue({ exists: true });

    // Act: Call the handler
    await handler(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'General chat already exists.' });
    expect(adminDb.set).not.toHaveBeenCalled();
    expect(adminDb.add).not.toHaveBeenCalled();
  });

  it('should return 405 if the method is not POST', async () => {
    // Arrange
    req.method = 'GET';

    // Act
    await handler(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.end).toHaveBeenCalledWith('Method GET Not Allowed');
  });

  it('should handle errors gracefully', async () => {
    // Arrange: Mock an error during the get call
    const testError = new Error('Firestore is angry');
    adminDb.get.mockRejectedValue(testError);

    // Act
    await handler(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Failed to create general chat.' });
  });
});
