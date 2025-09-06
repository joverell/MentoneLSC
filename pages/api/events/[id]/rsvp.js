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

        // Fetch user data to include in the RSVP
        const userDocRef = adminDb.collection('users').doc(userId);
        const userDoc = await userDocRef.get();
        if (!userDoc.exists) {
            // This case is unlikely if the user is authenticated, but good practice to handle
            return res.status(404).json({ message: 'User profile not found.' });
        }
        const userData = userDoc.data();

        // Check if the event exists before trying to RSVP
        const eventDocRef = adminDb.collection('events').doc(eventId);
        const eventDoc = await eventDocRef.get();
        if (!eventDoc.exists) {
            return res.status(404).json({ message: 'Event not found.' });
        }

        // Perform UPSERT operation using set
        const rsvpDocRef = adminDb.collection('events').doc(eventId).collection('rsvps').doc(userId);

        await rsvpDocRef.set({
            status,
            comment: comment || null,
            adultGuests: adults,
            kidGuests: kids,
            userName: userData.name, // Add user's name for easy display
            userEmail: userData.email, // Add user's email for reference
            updatedAt: FieldValue.serverTimestamp()
        }, { merge: true }); // It's good practice to use merge: true for updates

        return res.status(200).json({ message: 'RSVP submitted successfully.' });

    } catch (error) {
        console.error('RSVP API Error:', error); // Always log the full error for debugging

        // Handle Firebase Auth errors
        if (error.code && error.code.startsWith('auth/')) {
            return res.status(401).json({ message: 'Authentication error: ' + error.message });
        }

        // Handle Firestore errors
        if (error.code) {
            switch (error.code) {
                case 'permission-denied':
                    return res.status(403).json({ message: 'You do not have permission to RSVP for this event.' });
                case 'not-found':
                     return res.status(404).json({ message: 'The event could not be found.' });
                default:
                    return res.status(500).json({ message: `A database error occurred: ${error.message}` });
            }
        }

        // Generic fallback for other types of errors
        res.status(500).json({ message: 'An unexpected error occurred while processing your RSVP.' });
    }
}
