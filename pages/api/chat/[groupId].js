import { decrypt, encrypt } from '../../../lib/crypto';
import { getDb } from '../../../lib/db';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const JWT_SECRET = 'a-secure-and-long-secret-key-that-is-at-least-32-characters';

// Helper function to check if a user is in a group
function isUserInGroup(db, userId, groupId) {
  const stmt = db.prepare('SELECT 1 FROM user_access_groups WHERE user_id = ? AND group_id = ?');
  const result = stmt.get(userId, groupId);
  return !!result;
}

export default function handler(req, res) {
  const db = getDb();
  // 1. Authenticate the user from the token in the.cookie
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.auth_token;

  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    const { groupId: encryptedGroupId } = req.query;
    const groupId = decrypt(encryptedGroupId);

    if (!groupId) {
      return res.status(400).json({ message: 'Invalid group ID' });
    }

    // 2. Authorize: Check if the user is a member of the group
    if (!isUserInGroup(db, userId, groupId)) {
      return res.status(403).json({ message: 'Forbidden: You are not a member of this group.' });
    }

    if (req.method === 'GET') {
      // Fetch message history for the group
      const stmt = db.prepare(`
        SELECT
          cm.id,
          cm.message,
          cm.createdAt,
          u.id as userId,
          u.name as userName
        FROM
          chat_messages cm
        JOIN
          users u ON cm.user_id = u.id
        WHERE
          cm.group_id = ?
        ORDER BY
          cm.createdAt ASC
      `);
      const messages = stmt.all(groupId);
      const encryptedMessages = messages.map(msg => ({
        ...msg,
        id: encrypt(msg.id),
        userId: encrypt(msg.userId),
      }));
      return res.status(200).json(encryptedMessages);
    } else if (req.method === 'POST') {
      // Send a new message
      const { message } = req.body;

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ message: 'Message content cannot be empty' });
      }

      const stmt = db.prepare(
        'INSERT INTO chat_messages (group_id, user_id, message) VALUES (?, ?, ?)'
      );
      const info = stmt.run(groupId, userId, message.trim());

      // For simplicity, we'll just return success.
      // A more advanced implementation might return the created message object.
      return res.status(201).json({
        message: 'Message sent successfully',
        messageId: encrypt(info.lastInsertRowid),
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
