import { adminDb } from '../../../src/firebase-admin';
import admin from 'firebase-admin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const twentyFiveHoursFromNow = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const eventsSnapshot = await adminDb.collection('events')
      .where('start_time', '>', twentyFourHoursFromNow.toISOString())
      .where('start_time', '<', twentyFiveHoursFromNow.toISOString())
      .get();

    if (eventsSnapshot.empty) {
      return res.status(200).json({ message: 'No upcoming events to send reminders for.' });
    }

    const reminderPromises = eventsSnapshot.docs.map(async (eventDoc) => {
      const event = eventDoc.data();
      const eventId = eventDoc.id;

      const rsvpsSnapshot = await adminDb.collection('events').doc(eventId).collection('rsvps').where('status', '==', 'Yes').get();
      if (rsvpsSnapshot.empty) {
        return;
      }

      const userIds = rsvpsSnapshot.docs.map(doc => doc.id);
      const usersSnapshot = await adminDb.collection('users').where(admin.firestore.FieldPath.documentId(), 'in', userIds).get();

      const tokens = [];
      usersSnapshot.forEach(doc => {
        const userTokens = doc.data().fcmTokens;
        if (userTokens && Array.isArray(userTokens)) {
          tokens.push(...userTokens);
        }
      });

      if (tokens.length > 0) {
        const message = {
          notification: {
            title: `Reminder: ${event.title}`,
            body: `This event is starting in 24 hours.`,
          },
          webpush: {
            fcm_options: {
              link: `/`,
            },
          },
          tokens: tokens,
        };

        return admin.messaging().sendMulticast(message);
      }
    });

    await Promise.all(reminderPromises);

    return res.status(200).json({ message: 'Reminders sent successfully.' });
  } catch (error) {
    console.error('Error sending reminders:', error);
    return res.status(500).json({ message: 'An error occurred while sending reminders.' });
  }
}
