import { adminDb } from '../../../src/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import logger from '../../../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const cookies = parse(req.headers.cookie || '');
  const token = cookies.auth_token;

  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const { name, type, members, groups } = req.body;

    logger.info('Create chat request received', { userId, body: req.body });

    if (!name || !type) {
      logger.warn('Create chat request missing name or type', { userId, body: req.body });
      return res.status(400).json({ message: 'Name and type are required' });
    }

    const chatRef = adminDb.collection('chats').doc();
    const chatData = {
      name,
      type,
      createdBy: userId,
      createdAt: new Date().toISOString(),
    };

    if (type === 'private') {
      if (!members || !Array.isArray(members) || members.length === 0) {
        logger.warn('Create private chat request missing members', { userId, body: req.body });
        return res.status(400).json({ message: 'Members are required for private chats' });
      }
      chatData.members = [...new Set([userId, ...members])]; // Ensure creator is a member
    } else if (type === 'restricted') {
      if (!groups || !Array.isArray(groups) || groups.length === 0) {
        logger.warn('Create restricted chat request missing groups', { userId, body: req.body });
        return res.status(400).json({ message: 'Groups are required for restricted chats' });
      }
      chatData.groups = groups;
    }

    logger.info('Saving new chat document', { chatId: chatRef.id, chatData });
    await chatRef.set(chatData);

    // For private chats, update each member's user document to include the new group ID
    if (type === 'private') {
      const batch = adminDb.batch();
      chatData.members.forEach(memberId => {
        const userRef = adminDb.collection('users').doc(memberId);
        batch.update(userRef, { groupIds: FieldValue.arrayUnion(chatRef.id) });
      });
      await batch.commit();
      logger.info('Updated user groupIds for private chat members', { chatId: chatRef.id, members: chatData.members });
    }

    res.status(201).json({ message: 'Chat created successfully', chatId: chatRef.id });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      logger.warn('JWT error in create chat', { error: error.message });
      return res.status(401).json({ message: 'Invalid token' });
    }
    logger.error('Error creating chat', { errorMessage: error.message, errorStack: error.stack });
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
}
