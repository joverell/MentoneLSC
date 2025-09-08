import { adminDb, adminAuth } from '../../../../src/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import logger from '../../../../utils/logger';

export default async function handler(req, res) {
    const { id: eventId } = req.query;
    logger.info(`RSVP request for event ${eventId}`);

    if (req.method !== 'POST') {
        logger.warn(`Method ${req.method} not allowed for RSVP`);
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { authorization } = req.headers;
    if (!authorization || !authorization.startsWith('Bearer ')) {
        logger.warn('Missing or invalid authorization token');
        return res.status(401).json({ message: 'Missing or invalid authorization token' });
    }

    const token = authorization.split('Bearer ')[1];

    try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        const userId = decodedToken.uid;
        logger.info(`User ${userId} attempting to RSVP for event ${eventId}`);

        if (!eventId) {
            logger.warn('Invalid event ID');
            return res.status(400).json({ message: 'Invalid event ID' });
        }

        // Defensively parse the request body
        let body = req.body;
        if (typeof body === 'string') {
            try {
                body = JSON.parse(body);
            } catch (e) {
                logger.error('Invalid JSON in request body', { error: e });
                return res.status(400).json({ message: 'Invalid JSON in request body' });
            }
        }

        // Ensure body exists
        if (!body) {
            logger.warn('Missing request body');
            return res.status(400).json({ message: 'Missing request body' });
        }

        const { status, comment, adultGuests, kidGuests } = body;

        // Validate input
        if (!status) {
            logger.warn('Status is required.');
            return res.status(400).json({ message: 'Status is required.' });
        }
        if (!['Yes', 'No', 'Maybe'].includes(status)) {
            logger.warn(`Invalid status: ${status}`);
            return res.status(400).json({ message: "Invalid status. Must be one of 'Yes', 'No', 'Maybe'." });
        }
        const adults = adultGuests ? parseInt(adultGuests, 10) : 0;
        const kids = kidGuests ? parseInt(kidGuests, 10) : 0;

        if (isNaN(adults) || adults < 0 || isNaN(kids) || kids < 0) {
            logger.warn('Guest counts must be non-negative numbers.');
            return res.status(400).json({ message: 'Guest counts must be non-negative numbers.' });
        }

        // Check if the event exists before trying to RSVP
        const eventDocRef = adminDb.collection('events').doc(eventId);
        const eventDoc = await eventDocRef.get();
        if (!eventDoc.exists) {
            logger.warn(`Event not found: ${eventId}`);
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

        logger.info(`Successfully RSVPed for user ${userId} on event ${eventId} with status ${status}`);
        return res.status(200).json({ message: 'RSVP submitted successfully.' });

    } catch (error) {
        logger.error('RSVP API Error', { error: { message: error.message, stack: error.stack }, context: { eventId } });

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
