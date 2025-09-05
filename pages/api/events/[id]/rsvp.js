import { adminDb } from '../../../../src/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET;

export default async function handler(req, res) {
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
    const userId = String(decoded.uid); // Ensure userId is a string from the JWT `uid` claim

    const { id: eventId } = req.query;

    if (!eventId) {
      return res.status(400).json({ message: 'Invalid event ID' });
    }

    const { status, comment, adultGuests, kidGuests } = req.body;

    // 2. Validate input
    if (!status) {
      return res.status(400).json({ message: 'Status is required.' });
    }
    if (!['Yes', 'No', 'Maybe'].includes(status)) {
      return res.status(400).json({ message: "Invalid status. Must be one of 'Yes', 'No', 'Maybe'." });
    }
    const adults = adultGuests ? parseInt(adultGuests, 10) : 0;
    const kids = kidGuests ? parseInt(kidGuests, 10) : 0;

    if (isNaN(adults) || adults < 0 || isNaN(kids) || kids < 0) {
        return res.status(400).json({ message: 'Guest counts must be non-negative numbers.' });
    }

    // 3. Check if the event exists before trying to RSVP
    const eventDocRef = adminDb.collection('events').doc(eventId);
    const eventDoc = await eventDocRef.get();
    if (!eventDoc.exists()) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    // 4. Perform UPSERT operation using set
    // The doc path is 'events/{eventId}/rsvps/{userId}'
    const rsvpDocRef = adminDb.collection('events').doc(eventId).collection('rsvps').doc(userId);

    await rsvpDocRef.set({
      status,
      comment: comment || null,
      adultGuests: adults,
      kidGuests: kids,
      updatedAt: FieldValue.serverTimestamp()
    });

    // Note: To keep the rsvpTally on the event document updated,
    // a more advanced implementation would use a Cloud Function triggered
    // by this write to update the counts on the parent event document.
    // For now, the counts are calculated on-the-fly in the GET /api/events endpoint.

    return res.status(200).json({ message: 'RSVP submitted successfully.' });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.error('RSVP API Error:', error);
    res.status(500).json({ message: 'An error occurred while submitting RSVP.' });
  }
}
