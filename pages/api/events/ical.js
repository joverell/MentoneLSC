import { db } from '../../../src/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

// Helper to format dates for iCal
// YYYYMMDDTHHMMSSZ
const formatDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

// Helper to escape iCal special characters
const escapeText = (text) => {
    return text.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;');
};

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        // Fetch all public events
        const eventsCollection = collection(db, 'events');
        // An event is public if 'visibleToGroups' is null, undefined, or an empty array.
        // Firestore doesn't have a direct query for this, so we fetch all and filter.
        // For larger scale, this might need optimization or a dedicated 'isPublic' field.
        const eventsSnapshot = await getDocs(eventsCollection);

        let icalContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//MentoneLSC//NONSGML v1.0//EN',
            'CALSCALE:GREGORIAN',
            'X-WR-CALNAME:Mentone LSC Events',
            'X-WR-TIMEZONE:Australia/Melbourne',
        ];

        eventsSnapshot.forEach(doc => {
            const event = doc.data();
            const visibleToGroups = event.visibleToGroups || [];

            // Only include public events in the feed
            if (visibleToGroups.length === 0) {
                const eventId = doc.id;
                const startDate = new Date(event.start_time);
                const endDate = new Date(event.end_time);

                icalContent.push('BEGIN:VEVENT');
                icalContent.push(`UID:${eventId}@mentonelsc.com`);
                icalContent.push(`DTSTAMP:${formatDate(new Date())}`);
                icalContent.push(`DTSTART:${formatDate(startDate)}`);
                icalContent.push(`DTEND:${formatDate(endDate)}`);
                icalContent.push(`SUMMARY:${escapeText(event.title)}`);

                let description = '';
                if (event.description) {
                    // Stripping HTML for iCal description
                    const plainTextDescription = event.description.replace(/<[^>]*>?/gm, '');
                    description += escapeText(plainTextDescription);
                }
                if (event.location) {
                    description += `\\n\\nLocation: ${escapeText(event.location)}`;
                }
                icalContent.push(`DESCRIPTION:${description}`);

                if (event.location) {
                    icalContent.push(`LOCATION:${escapeText(event.location)}`);
                }

                icalContent.push('END:VEVENT');
            }
        });

        icalContent.push('END:VCALENDAR');

        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="mentonelsc-events.ics"');
        res.status(200).send(icalContent.join('\r\n'));

    } catch (error) {
        console.error('iCal feed generation error:', error);
        res.status(500).json({ message: 'Failed to generate iCal feed.' });
    }
}
