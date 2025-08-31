import db from '../../../lib/db';
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

// Function to get all events
function getEvents(req, res) {
  try {
    const stmt = db.prepare('SELECT * FROM events ORDER BY start_time ASC');
    const events = stmt.all();
    return res.status(200).json(events);
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return res.status(500).json({ message: 'An error occurred while fetching events.' });
  }
}

// Function to create a new event (protected)
function createEvent(req, res) {
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
