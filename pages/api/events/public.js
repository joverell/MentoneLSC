import { adminDb } from '../../../src/firebase-admin';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        // Fetch all public events
        const eventsCollection = adminDb.collection('events');
        const eventsSnapshot = await eventsCollection.get();

        const publicEvents = [];
        eventsSnapshot.forEach(doc => {
            const event = doc.data();
            const visibleToGroups = event.visibleToGroups || [];

            if (visibleToGroups.length === 0) {
                publicEvents.push({
                    id: doc.id,
                    ...event,
                });
            }
        });

        res.status(200).json(publicEvents);

    } catch (error) {
        console.error('Public events fetch error:', error);
        res.status(500).json({ message: 'Failed to fetch public events.' });
    }
}
