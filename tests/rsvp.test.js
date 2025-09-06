<<<<<<< SEARCH
  test('should return 404 if event does not exist', async () => {
    adminAuth.verifyIdToken.mockResolvedValue({ uid: userId });
    const eventDocRef = { get: jest.fn().mockResolvedValue({ exists: () => false }) }; // Corrected mock
    adminDb.collection.mockReturnValue({ doc: jest.fn().mockReturnValue(eventDocRef) });

    await rsvpHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Event not found.' });
  });
=======
  test('should return 404 if event does not exist', async () => {
    adminAuth.verifyIdToken.mockResolvedValue({ uid: userId });

    const userDoc = { name: 'Test User', email: 'test@example.com' };
    const userDocRef = { get: jest.fn().mockResolvedValue({ exists: true, data: () => userDoc }) };
    const eventDocRef = { get: jest.fn().mockResolvedValue({ exists: false }) };

    adminDb.collection.mockImplementation((name) => {
        if (name === 'users') {
            return { doc: jest.fn().mockReturnValue(userDocRef) };
        }
        if (name === 'events') {
            return { doc: jest.fn().mockReturnValue(eventDocRef) };
        }
        return {};
    });

    await rsvpHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Event not found.' });
  });
>>>>>>> REPLACE
