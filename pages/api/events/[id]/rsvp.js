import { adminDb, adminAuth } from '../../../../src/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { authorization } = req.headers;
    if (!authorization || !authorization.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Missing or invalid authorization token' });
    }

    const token = authorization.split('Bearer ')[1];

    try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        const userId = decodedToken.uid;

        const { id: eventId } = req.query;

        if (!eventId) {
            return res.status(400).json({ message: 'Invalid event ID' });
        }

        const { status, comment, adultGuests, kidGuests } = req.body;

        // Validate input
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

        // Check if the event exists before trying to RSVP
        const eventDocRef = adminDb.collection('events').doc(eventId);
        const eventDoc = await eventDocRef.get();
        if (!eventDoc.exists()) {
            return res.status(404).json({ message: 'Event not found.' });
        }

        // Perform UPSERT operation using set
        const rsvpDocRef = adminDb.collection('events').doc(eventId).collection('rsvps').doc(userId);

        await rsvpDocRef.set({
            status,
            comment: comment || null,
            adultGuests: adults,
            kidGuests: kids,
            updatedAt: FieldValue.serverTimestamp()
        }, { merge: true }); // It's good practice to use merge: true for updates

        return res.status(200).json({ message: 'RSVP submitted successfully.' });

    } catch (error) {
        if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error' || error.code === 'auth/id-token-revoked') {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }
        console.error('RSVP API Error:', error);
        res.status(500).json({ message: 'An error occurred while submitting RSVP.' });
    }
}
