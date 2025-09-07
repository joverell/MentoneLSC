import { adminDb } from '../../../src/firebase-admin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const generalChatRef = adminDb.collection('chats').doc('general');
    const doc = await generalChatRef.get();

    if (doc.exists) {
      return res.status(200).json({ message: 'General chat already exists.' });
    }

    // Create the general chat document
    await generalChatRef.set({
      name: 'General',
      description: 'Public chat for all members.',
      createdAt: new Date().toISOString(),
    });

    // Optional: Add a welcome message to the subcollection
    await generalChatRef.collection('messages').add({
      message: 'Welcome to the general chat!',
      userName: 'System',
      userId: 'system',
      createdAt: new Date(),
    });

    return res.status(201).json({ message: 'General chat created successfully.' });
  } catch (error) {
    console.error('Error setting up general chat:', error);
    return res.status(500).json({ message: 'Failed to create general chat.' });
  }
}
