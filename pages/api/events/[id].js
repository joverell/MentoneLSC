import { adminDb } from '../../../src/firebase-admin';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET;

// Helper to authorize if the user is an admin or a group admin for the event
async function authorize(req, eventId) {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.auth_token;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.uid;

    // Super Admins can do anything
    if (decoded.roles && decoded.roles.includes('Admin')) {
      return { authorized: true, user: decoded };
    }

    const isGroupAdminRole = decoded.roles && decoded.roles.includes('Group Admin');
    if (!isGroupAdminRole) {
        return null; // Not a group admin, so can't proceed
    }

    // Check if the user is a group admin for the event
    const eventRef = adminDb.collection('events').doc(eventId);
    const eventDoc = await eventRef.get();
    if (!eventDoc.exists) return null;

    const eventData = eventDoc.data();
    const eventGroups = eventData.visibleToGroups || [];
    if (eventGroups.length === 0) return null; // Only super admins can manage public events

    const userDocRef = adminDb.collection('users').doc(userId);
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) return null;

    const userAdminGroups = userDoc.data().adminForGroups || [];
    const canAdminEvent = eventGroups.some(groupId => userAdminGroups.includes(groupId));

    if (canAdminEvent) {
        return { authorized: true, user: decoded }; // Authorized as a group admin
    }

    return null; // Not authorized
  } catch (error) {
    console.error("Authorization error:", error);
    return null;
  }
}

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    return getEvent(req, res, id);
  }

  const authResult = await authorize(req, id);

  if (!authResult || !authResult.authorized) {
    return res.status(403).json({ message: 'Forbidden: You do not have permission to perform this action.' });
  }

  switch (req.method) {
    case 'PUT':
      return updateEvent(req, res, id);
    case 'DELETE':
      return deleteEvent(req, res, id);
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

async function getEvent(req, res, eventId) {
    try {
        const eventRef = adminDb.collection('events').doc(eventId);
        const doc = await eventRef.get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'Event not found' });
        }
        res.status(200).json({ id: doc.id, ...doc.data() });
    } catch (error) {
        console.error(`Error fetching event ${eventId}:`, error);
        res.status(500).json({ message: 'An error occurred while fetching event details.' });
    }
}

async function updateEvent(req, res, eventId) {
  const { title, description, start_time, end_time, location, imageUrl, visibleToGroups } = req.body;

  if (!title || !description || !start_time || !end_time) {
    return res.status(400).json({ message: 'Missing required event fields' });
  }

  try {
    const eventRef = adminDb.collection('events').doc(eventId);
    await eventRef.update({
      title,
      description,
      start_time,
      end_time,
      location: location || null,
      imageUrl: imageUrl || null,
      visibleToGroups: visibleToGroups || [],
    });
    res.status(200).json({ message: 'Event updated successfully.' });
  } catch (error) {
    console.error(`Error updating event ${eventId}:`, error);
    res.status(500).json({ message: 'An error occurred while updating the event.' });
  }
}

async function deleteEvent(req, res, eventId) {
  try {
    const eventRef = adminDb.collection('events').doc(eventId);
    const eventDoc = await eventRef.get();
    if (!eventDoc.exists) {
        return res.status(404).json({ message: 'Event not found' });
    }
    const eventData = eventDoc.data();
    const { title, visibleToGroups } = eventData;


    // Optional: Delete subcollections like RSVPs if they exist
    const rsvpsRef = eventRef.collection('rsvps');
    const rsvpsSnapshot = await rsvpsRef.get();
    const batch = adminDb.batch();
    rsvpsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    // Delete the main event document
    await eventRef.delete();

    // --- Send Push Notifications ---
    try {
        let usersQuery = adminDb.collection('users');
        if (visibleToGroups && visibleToGroups.length > 0) {
            usersQuery = usersQuery.where('groupIds', 'array-contains-any', visibleToGroups);
        }
        const usersSnapshot = await usersQuery.get();
        const tokens = usersSnapshot.docs.flatMap(doc => doc.data().fcmTokens || []);

        if (tokens.length > 0) {
            await admin.messaging().sendMulticast({
                notification: { title: 'Event Cancelled', body: title },
                webpush: { fcm_options: { link: '/' } },
                tokens,
            });
        }
    } catch (e) {
        console.error("Notification failed for event deletion:", e);
    }
    // --- End Notifications ---

    res.status(200).json({ message: 'Event deleted successfully.' });
  } catch (error) {
    console.error(`Error deleting event ${eventId}:`, error);
    res.status(500).json({ message: 'An error occurred while deleting the event.' });
  }
}
