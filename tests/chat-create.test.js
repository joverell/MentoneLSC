import handler from '../pages/api/chats/create';
import { adminDb } from '../src/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import jwt from 'jsonwebtoken';

jest.mock('../src/firebase-admin', () => {
  const set = jest.fn();
  const update = jest.fn();
  const doc = jest.fn((path) => {
    // Make doc path-aware for user lookups
    if (path && path.startsWith('users/')) {
      return { update };
    }
    return { id: 'new-chat-id', set };
  });
  const collection = jest.fn(() => ({ doc }));
  const batchCommit = jest.fn().mockResolvedValue();
  const batchUpdate = jest.fn();
  const batch = jest.fn(() => ({
    update: batchUpdate,
    commit: batchCommit,
  }));
  return {
    adminDb: {
      collection,
      batch,
    },
  };
});

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    arrayUnion: jest.fn(val => `arrayUnion(${val})`), // Mock implementation
  },
}));

jest.mock('jsonwebtoken');

describe('/api/chats/create', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      method: 'POST',
      headers: {
        cookie: 'auth_token=test-token',
      },
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
    };
    jwt.verify.mockReturnValue({ userId: 'test-user' });
  });

  it('should create a public chat', async () => {
    req.body = {
      name: 'Public Chat',
      type: 'public',
    };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ message: 'Chat created successfully', chatId: 'new-chat-id' });
    expect(adminDb.collection('chats').doc().set).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Public Chat',
      type: 'public',
      createdBy: 'test-user',
    }));
  });

  it('should create a private chat with members and update user groupIds', async () => {
    req.body = {
      name: 'Private Chat',
      type: 'private',
      members: ['user1', 'user2'],
    };
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(adminDb.collection('chats').doc().set).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Private Chat',
      type: 'private',
      members: expect.arrayContaining(['test-user', 'user1', 'user2']),
    }));

    // Verify batch update was called correctly
    const { batch } = adminDb;
    expect(batch).toHaveBeenCalledTimes(1);

    const batchInstance = batch.mock.results[0].value;
    expect(batchInstance.update).toHaveBeenCalledTimes(3); // Creator + 2 members
    expect(batchInstance.update).toHaveBeenCalledWith(expect.anything(), { groupIds: 'arrayUnion(new-chat-id)' });
    expect(batchInstance.commit).toHaveBeenCalledTimes(1);
  });

  it('should create a restricted chat with groups', async () => {
    req.body = {
      name: 'Restricted Chat',
      type: 'restricted',
      groups: ['group1', 'group2'],
    };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(adminDb.collection('chats').doc().set).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Restricted Chat',
      type: 'restricted',
      groups: ['group1', 'group2'],
    }));
  });

  it('should return 401 if not authenticated', async () => {
    req.headers.cookie = '';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should return 400 for invalid input', async () => {
    req.body = {
      name: 'Invalid Chat',
    };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
