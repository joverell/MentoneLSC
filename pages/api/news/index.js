import { adminDb } from '../../../src/firebase-admin';
import admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET;

function encrypt(id) {
  // Encrypt the ID into a short-lived JWT
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: '1h' });
}

export default function handler(req, res) {
  if (req.method === 'GET') {
    return getNews(req, res);
  } else if (req.method === 'POST') {
    return createNews(req, res);
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

// Function to get all news articles from Firestore
async function getNews(req, res) {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.auth_token;
  let user = null;

  if (token) {
      try {
          user = jwt.verify(token, JWT_SECRET);
      } catch (e) {
          console.warn("Invalid auth token on news fetch");
      }
  }

  try {
    const newsCollection = adminDb.collection('news').orderBy('createdAt', 'desc');
    const newsSnapshot = await newsCollection.get();

    const articles = newsSnapshot.docs.map(doc => {
        const data = doc.data();

        const isPublic = !data.visibleToGroups || data.visibleToGroups.length === 0;
        const isAdmin = user && user.roles && user.roles.includes('Admin');

        let canView = isPublic || isAdmin;

        if (!canView && user && user.groupIds) {
            const userGroups = new Set(user.groupIds);
            const articleGroups = new Set(data.visibleToGroups);
            for (const group of articleGroups) {
                if (userGroups.has(group)) {
                    canView = true;
                    break;
                }
            }
        }

        if (!canView) return null;

        const likes = data.likes || [];
        const currentUserHasLiked = user ? likes.includes(user.userId) : false;

        return {
            id: encrypt(doc.id),
            title: data.title,
            content: data.content,
            imageUrl: data.imageUrl || null,
            authorName: data.authorName,
            createdAt: data.createdAt.toDate().toISOString(),
            likeCount: data.likeCount || 0,
            currentUserHasLiked: currentUserHasLiked,
        };
    }).filter(Boolean); // Filter out null values

    return res.status(200).json(articles);
  } catch (error) {
    console.error('Failed to fetch news:', error);
    return res.status(500).json({ message: 'An error occurred while fetching news articles.' });
  }
}

// Function to create a new news article in Firestore (protected)
async function createNews(req, res) {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.auth_token;

  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // --- Authorization Check ---
    const isSuperAdmin = decoded.roles && decoded.roles.includes('Admin');
    const isGroupAdminRole = decoded.roles && decoded.roles.includes('Group Admin');

    if (!isSuperAdmin && !isGroupAdminRole) {
        return res.status(403).json({ message: 'Forbidden: You do not have permission to create articles.' });
    }

    const userId = decoded.userId; // Ensure consistent user ID property
    const { title, content, imageUrl, visibleToGroups } = req.body;

    if (!isSuperAdmin) { // This means the user is a Group Admin
        if (!visibleToGroups || visibleToGroups.length === 0) {
            return res.status(403).json({ message: 'Forbidden: Group Admins must select at least one group for the article.' });
        }

        const userDocRef = adminDb.collection('users').doc(userId);
        const userDoc = await userDocRef.get();
        if (!userDoc.exists) {
            return res.status(404).json({ message: 'User not found.' });
        }
        const userAdminGroups = userDoc.data().adminForGroups || [];
        const canAdminAllSelectedGroups = visibleToGroups.every(groupId => userAdminGroups.includes(groupId));

        if (!canAdminAllSelectedGroups) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission to create news for all of the selected group(s).' });
        }
    }
    // --- End Authorization Check ---

    if (!title || !content) {
      return res.status(400).json({ message: 'Missing required fields: title and content' });
    }

    // Fetch author's name from 'users' collection to denormalize data
    const userDocRef = adminDb.collection('users').doc(String(userId));
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) {
        return res.status(404).json({ message: 'User not found' });
    }
    const authorName = userDoc.data().name;


    const newArticleRef = await adminDb.collection('news').add({
      title,
      content,
      imageUrl,
      created_by: userId,
      authorName, // Denormalized author's name
      visibleToGroups: visibleToGroups || [],
      createdAt: FieldValue.serverTimestamp(),

    });

    // --- Send Push Notifications ---
    try {
        let usersQuery = adminDb.collection('users');

        // If the article is restricted to certain groups, filter the users
        if (visibleToGroups && visibleToGroups.length > 0) {
            usersQuery = usersQuery.where('groupIds', 'array-contains-any', visibleToGroups);
        }

        const usersSnapshot = await usersQuery.get();
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
                    title: 'New Club News',
                    body: title,
                },
                webpush: {
                    fcm_options: {
                        link: `/`, // Link to the news page
                    },
                },
                tokens: tokens,
            };

            // Using sendMulticast instead of sendToDevice for multiple tokens
            const response = await admin.messaging().sendMulticast(message);
            console.log('Successfully sent message:', response.successCount, 'messages');
            if (response.failureCount > 0) {
                console.log('Failed to send to', response.failureCount, 'tokens');
            }
        }
    } catch (notificationError) {
        console.error('Failed to send push notifications:', notificationError);
        // Do not fail the whole request if notifications fail
    }
    // --- End of Push Notifications ---


    return res.status(201).json({
      message: 'News article created successfully',
      articleId: newArticleRef.id,
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.error('News Creation Error:', error);
    return res.status(500).json({ message: 'An error occurred during news creation' });
  }
}
