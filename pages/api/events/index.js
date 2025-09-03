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
      let total_guests = 0;
      let currentUserRsvpStatus = null;
      let rsvpList = [];

      // If user is admin, fetch full RSVP details
      if (isAdmin) {
        const rsvpPromises = rsvpsSnapshot.docs.map(async (rsvpDoc) => {
          const rsvpData = rsvpDoc.data();
          const rsvpUserId = rsvpDoc.id;

          // Fetch user name for the RSVP
          const userDocRef = adminDb.collection('users').doc(rsvpUserId);
          const userDoc = await userDocRef.get();
          const userName = userDoc.exists() ? userDoc.data().name : 'Unknown User';

          return {
            userId: rsvpUserId,
            userName: userName,
            status: rsvpData.status,
            comment: rsvpData.comment || '',
            adultGuests: rsvpData.adultGuests || 0,
            kidGuests: rsvpData.kidGuests || 0,
            updatedAt: rsvpData.updatedAt.toDate().toISOString(),
          };
        });
        rsvpList = await Promise.all(rsvpPromises);

        let total_adults = 0;
        let total_kids = 0;

        // Calculate tallies from the fetched list
        rsvpList.forEach(rsvp => {
            if (rsvp.status === 'Yes') {
                yes_count++;
                total_adults += (rsvp.adultGuests || 0);
                total_kids += (rsvp.kidGuests || 0);
            }
            if (rsvp.status === 'No') no_count++;
            if (rsvp.status === 'Maybe') maybe_count++;
        });
        total_guests = total_adults + total_kids;

      } else { // If not admin, just calculate tallies
        rsvpsSnapshot.forEach(rsvpDoc => {
            const rsvpData = rsvpDoc.data();
            if (rsvpData.status === 'Yes') yes_count++;
            if (rsvpData.status === 'No') no_count++;
            if (rsvpData.status === 'Maybe') maybe_count++;
        });
      }

      // Find current user's RSVP status regardless of admin status
      const currentUserRsvpDoc = rsvpsSnapshot.docs.find(doc => user && doc.id === String(user.uid));
      if (currentUserRsvpDoc) {
          currentUserRsvpStatus = currentUserRsvpDoc.data().status;
      }


      return {
        ...eventData,
        id: eventId,
        created_by: eventData.created_by,
        currentUserRsvpStatus,
        rsvpTally: {
          yes: yes_count,
          no: no_count,
          maybe: maybe_count,
          guests: total_guests,
        },
        rsvps: isAdmin ? rsvpList.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)) : [], // Only send full list to admins
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
    const userId = decoded.uid; // uid from custom claims

    const { title, description, start_time, end_time, location, imageUrl, visibleToGroups, recurrence } = req.body;
    if (!title || !description || !start_time || !end_time) {
      return res.status(400).json({ message: 'Missing required event fields' });
    }

    // --- Authorization Check ---
    const isSuperAdmin = decoded.isSuperAdmin === true;
    let isGroupAdmin = false;

    if (!isSuperAdmin) {
        if (!visibleToGroups || visibleToGroups.length === 0) {
            return res.status(403).json({ message: 'Forbidden: Only Super Admins can create public events.' });
        }

        for (const groupId of visibleToGroups) {
            const groupDocRef = adminDb.collection('access_groups').doc(groupId);
            const groupDoc = await groupDocRef.get();
            if (groupDoc.exists && groupDoc.data().admins && groupDoc.data().admins.includes(userId)) {
                isGroupAdmin = true;
                break;
            }
        }

        if (!isGroupAdmin) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission to create events for the selected group(s).' });
        }
    }
    // --- End Authorization Check ---

    const userDocRef = adminDb.collection('users').doc(String(userId));
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) {
        return res.status(404).json({ message: 'User not found' });
    }
    const authorName = userDoc.data().name;

    const baseEvent = {
        title,
        description,
        location: location || null,
        imageUrl: imageUrl || null,
        created_by: userId,
        authorName,
        visibleToGroups: visibleToGroups || [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (recurrence && recurrence.enabled) {
        // --- Recurring Event Logic ---
        const { frequency, endDate } = recurrence;
        if (!frequency || !endDate) {
            return res.status(400).json({ message: 'Frequency and end date are required for recurring events.' });
        }

        const seriesId = adminDb.collection('events').doc().id; // Generate a unique ID for the series
        const batch = adminDb.batch();

        let currentStartDate = new Date(start_time);
        const finalEndDate = new Date(endDate);
        const eventDuration = new Date(end_time).getTime() - new Date(start_time).getTime();

        while (currentStartDate <= finalEndDate) {
            const newDocRef = adminDb.collection('events').doc();
            const currentEndDate = new Date(currentStartDate.getTime() + eventDuration);

            batch.set(newDocRef, {
                ...baseEvent,
                start_time: currentStartDate.toISOString(),
                end_time: currentEndDate.toISOString(),
                seriesId: seriesId,
            });

            // Increment date based on frequency
            switch (frequency) {
                case 'weekly':
                    currentStartDate.setDate(currentStartDate.getDate() + 7);
                    break;
                case 'fortnightly':
                    currentStartDate.setDate(currentStartDate.getDate() + 14);
                    break;
                case 'monthly':
                    currentStartDate.setMonth(currentStartDate.getMonth() + 1);
                    break;
                default:
                    return res.status(400).json({ message: 'Invalid recurrence frequency.' });
            }
        }
        await batch.commit();
        return res.status(201).json({ message: `Recurring event series created successfully.` });

    } else {
        // --- Single Event Logic ---
        const newEventRef = await adminDb.collection('events').add({
            ...baseEvent,
            start_time,
            end_time,
        });
        return res.status(201).json({
            message: 'Event created successfully',
            eventId: newEventRef.id,
        });
    }

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.error('Event Creation Error:', error);
    return res.status(500).json({ message: 'An error occurred during event creation' });
  }
}
