import { adminDb } from '../../../src/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET;

export default async function handler(req, res) {
  // 1. Authenticate the user from the token in the cookie
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.auth_token;

  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.uid;
    const userName = decoded.name;

    const { groupId } = req.query;

    if (!groupId) {
      return res.status(400).json({ message: 'Invalid group ID' });
    }

    // 2. Authorize: Check if the user is a member of the group by checking their Firestore document
    const userDocRef = adminDb.collection('users').doc(userId);
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) {
        return res.status(404).json({ message: 'User not found.' });
    }
    const userData = userDoc.data();
    const userGroupIds = userData.groupIds || [];

    if (!userGroupIds.includes(groupId)) {
      return res.status(403).json({ message: 'Forbidden: You are not a member of this group.' });
    }

    const messagesCollectionRef = adminDb.collection('chats').doc(groupId).collection('messages');

    if (req.method === 'GET') {
      const q = messagesCollectionRef.orderBy('createdAt', 'asc');
      const messagesSnapshot = await q.get();
      const messages = messagesSnapshot.docs.map(msgDoc => {
        const msgData = msgDoc.data();
        return {
          id: msgDoc.id,
          message: msgData.message,
          createdAt: msgData.createdAt.toDate(), // Convert Firestore timestamp to JS Date
          userId: msgData.userId,
          userName: msgData.userName,
        };
      });
      return res.status(200).json(messages);

    } else if (req.method === 'POST') {
      const { message } = req.body;

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ message: 'Message content cannot be empty' });
      }

      const newMessage = {
        message: message.trim(),
        userId: userId,
        userName: userName, // Denormalize user's name for easy display
        createdAt: FieldValue.serverTimestamp(),
      };

      const newDocRef = await messagesCollectionRef.add(newMessage);

      return res.status(201).json({
        message: 'Message sent successfully',
        messageId: newDocRef.id,
      });

    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.error('Chat API Error:', error);
    return res.status(500).json({ message: 'An internal server error occurred.' });
  }
}
