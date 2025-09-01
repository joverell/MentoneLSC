import { getDb } from '../../../lib/db';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const JWT_SECRET = 'a-secure-and-long-secret-key-that-is-at-least-32-characters';

export default function handler(req, res) {
  if (req.method === 'GET') {
    return getEvents(req, res);
  } else if (req.method === 'POST') {
    return createEvent(req, res);
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

// Function to get all events, including RSVP data
function getEvents(req, res) {
  const db = getDb();
  let userId = null;
  try {
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.auth_token;
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.userId;
    }
  } catch (err) {
    // Ignore errors if token is invalid, user is just not logged in
  }

  try {
    const sql = `
      SELECT
        e.*,
        u.name as authorName,
        r.status as currentUserRsvpStatus,
        (SELECT COUNT(*) FROM rsvps WHERE event_id = e.id AND status = 'Yes') as yes_count,
        (SELECT COUNT(*) FROM rsvps WHERE event_id = e.id AND status = 'No') as no_count,
        (SELECT COUNT(*) FROM rsvps WHERE event_id = e.id AND status = 'Maybe') as maybe_count
      FROM
        events e
      JOIN
        users u ON e.created_by = u.id
      LEFT JOIN
        rsvps r ON e.id = r.event_id AND r.user_id = ?
      ORDER BY
        e.start_time ASC
    `;
    const stmt = db.prepare(sql);
    const events = stmt.all(userId).map(event => ({
      ...event,
      rsvpTally: {
        yes: event.yes_count,
        no: event.no_count,
        maybe: event.maybe_count,
      }
    }));
    return res.status(200).json(events);
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return res.status(500).json({ message: 'An error occurred while fetching events.' });
  }
}

// Function to create a new event (protected)
function createEvent(req, res) {
  const db = getDb();
  // 1. Authenticate the user
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.auth_token;

  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // 2. Authorize the user
    if (!decoded.roles || !decoded.roles.includes('Admin')) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to create events.' });
    }

    const userId = decoded.userId;

    // 3. Validate request body
    const { title, description, start_time, end_time, location } = req.body;
    if (!title || !description || !start_time || !end_time) {
      return res.status(400).json({ message: 'Missing required event fields' });
    }

    // 3. Insert into database
    const stmt = db.prepare(
      'INSERT INTO events (title, description, start_time, end_time, location, created_by) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const info = stmt.run(title, description, start_time, end_time, location || null, userId);

    return res.status(201).json({ message: 'Event created successfully', eventId: info.lastInsertRowid });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.error('Event Creation Error:', error);
    return res.status(500).json({ message: 'An error occurred during event creation' });
  }
}
