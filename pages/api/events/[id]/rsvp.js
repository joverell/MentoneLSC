import { decrypt } from '../../../../lib/crypto';
import { getDb } from '../../../../lib/db';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const JWT_SECRET = 'a-secure-and-long-secret-key-that-is-at-least-32-characters';

export default function handler(req, res) {
  const db = getDb();
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // 1. Authenticate the user
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.auth_token;

  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const { id: encryptedEventId } = req.query;
    const eventId = decrypt(encryptedEventId);

    if (!eventId) {
      return res.status(400).json({ message: 'Invalid event ID' });
    }

    const { status, comment } = req.body;

    // 2. Validate input
    if (!status) {
      return res.status(400).json({ message: 'Status is required.' });
    }
    if (!['Yes', 'No', 'Maybe'].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Must be one of 'Yes', 'No', 'Maybe'." });
    }

    // 3. Perform UPSERT operation
    const stmt = db.prepare(`
      INSERT INTO rsvps (event_id, user_id, status, comment, updatedAt)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(event_id, user_id) DO UPDATE SET
        status = excluded.status,
        comment = excluded.comment,
        updatedAt = CURRENT_TIMESTAMP
    `);

    stmt.run(eventId, userId, status, comment || null);

    return res.status(200).json({ message: 'RSVP submitted successfully.' });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    // Handle foreign key constraint failure, e.g., event doesn't exist
    if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
        return res.status(404).json({ message: 'Event not found.' });
    }
    console.error('RSVP API Error:', error);
    res.status(500).json({ message: 'An error occurred while submitting RSVP.' });
  }
}
