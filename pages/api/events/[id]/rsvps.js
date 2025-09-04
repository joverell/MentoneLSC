import { adminDb } from '../../../../src/firebase-admin';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

// A simplified authorization check for admins
async function authorizeAdmin(req) {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.auth_token;
  if (!token) return false;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Check if the user has an 'Admin' role
    return decoded && decoded.roles && decoded.roles.includes('Admin');
  } catch (error) {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const isAdmin = await authorizeAdmin(req);
  if (!isAdmin) {
    return res.status(403).json({ message: 'Forbidden: You do not have permission to view RSVPs.' });
  }

  const { id: eventId } = req.query;

  try {
    const rsvpsRef = adminDb.collection('events').doc(eventId).collection('rsvps');
    const snapshot = await rsvpsRef.orderBy('timestamp', 'desc').get();

    if (snapshot.empty) {
      return res.status(200).json([]);
    }

    const rsvps = snapshot.docs.map(doc => ({
      userId: doc.id,
      ...doc.data(),
    }));

    res.status(200).json(rsvps);
  } catch (error) {
    console.error(`Error fetching RSVPs for event ${eventId}:`, error);
    res.status(500).json({ message: 'An error occurred while fetching RSVPs.' });
  }
}
