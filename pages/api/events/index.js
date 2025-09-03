import { db } from '../../../src/firebase';
import { adminDb } from '../../../src/firebase-admin';
import admin from 'firebase-admin';
import { collection, getDocs, query, orderBy, collectionGroup, where } from 'firebase/firestore';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET;

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

// Function to get all events, including RSVP data from Firestore
async function getEvents(req, res) {
  let user = null;
  try {
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.auth_token;
    if (token) {
      user = jwt.verify(token, JWT_SECRET);
    }
  } catch (err) {
    // Ignore errors, user is simply not logged in
  }

  try {
    const eventsCollection = collection(db, 'events');
    const q = query(eventsCollection, orderBy('start_time', 'asc'));
    const eventsSnapshot = await getDocs(q);

    const eventPromises = eventsSnapshot.docs.map(async (eventDoc) => {
      const eventData = eventDoc.data();
      const eventId = eventDoc.id;

      const isPublic = !eventData.visibleToGroups || eventData.visibleToGroups.length === 0;
      const isAdmin = user && user.roles && user.roles.includes('Admin');

      let canView = isPublic || isAdmin;

      if (!canView && user && user.groupIds) {
        const userGroups = new Set(user.groupIds);
        const eventGroups = new Set(eventData.visibleToGroups);
        for (const group of eventGroups) {
          if (userGroups.has(group)) {
            canView = true;
            break;
          }
        }
      }

      if (!canView) return null;

      // Fetch RSVPs for this event
      const rsvpsCollection = collection(db, 'events', eventId, 'rsvps');
      const rsvpsSnapshot = await getDocs(rsvpsCollection);

      let yes_count = 0;
      let no_count = 0;
      let maybe_count = 0;
      let currentUserRsvpStatus = null;

      rsvpsSnapshot.forEach(rsvpDoc => {
        const rsvpData = rsvpDoc.data();
        if (rsvpData.status === 'Yes') yes_count++;
        if (rsvpData.status === 'No') no_count++;
        if (rsvpData.status === 'Maybe') maybe_count++;
        if (user && rsvpDoc.id === String(user.userId)) {
          currentUserRsvpStatus = rsvpData.status;
        }
      });

      return {
        ...eventData,
        id: encrypt(eventId),
        created_by: encrypt(eventData.created_by),
        currentUserRsvpStatus,
        rsvpTally: {
          yes: yes_count,
          no: no_count,
          maybe: maybe_count,
        }
      };
    });

    const events = (await Promise.all(eventPromises)).filter(Boolean);

    return res.status(200).json(events);
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return res.status(500).json({ message: 'An error occurred while fetching events.' });
  }
}

// Function to create a new event in Firestore (protected)
async function createEvent(req, res) {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.auth_token;

  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const { title, description, start_time, end_time, location, imageUrl, visibleToGroups } = req.body;
    if (!title || !description || !start_time || !end_time) {
      return res.status(400).json({ message: 'Missing required event fields' });
    }

    // Fetch author's name for denormalization
    const userDocRef = adminDb.collection('users').doc(String(userId));
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) {
        return res.status(404).json({ message: 'User not found' });
    }
    const authorName = userDoc.data().name;

    const newEventRef = await adminDb.collection('events').add({
      title,
      description,
      start_time,
      end_time,
      location: location || null,
      imageUrl: imageUrl || null,
      created_by: userId,
      authorName,
      visibleToGroups: visibleToGroups || [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(201).json({
      message: 'Event created successfully',
      eventId: encrypt(newEventRef.id),
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.error('Event Creation Error:', error);
    return res.status(500).json({ message: 'An error occurred during event creation' });
  }
}
