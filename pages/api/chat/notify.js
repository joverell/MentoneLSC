import { adminDb } from '../../../src/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const cookies = parse(req.headers.cookie || '');
    const token = cookies.auth_token;

    if (!token) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const { groupId, message } = req.body;

        if (!groupId || !message) {
            return res.status(400).json({ message: 'Missing groupId or message' });
        }

        const groupRef = adminDb.collection('access_groups').doc(groupId);
        const groupDoc = await groupRef.get();
        if (!groupDoc.exists) {
            return res.status(404).json({ message: 'Group not found' });
        }
        const groupName = groupDoc.data().name;

        const usersSnapshot = await adminDb.collection('users').where('groupIds', 'array-contains', groupId).get();
        if (usersSnapshot.empty) {
            return res.status(200).json({ message: 'No users in this group to notify.' });
        }

        const tokens = [];
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            const wantsChatNotifs = (userData.notificationSettings && userData.notificationSettings.chat !== undefined) ? userData.notificationSettings.chat : true;

            // Do not send notification to the sender, and check their preference
            if (wantsChatNotifs && userData.fcmTokens && doc.id !== decoded.userId) {
                // fcmTokens is an array of tokens
                if(Array.isArray(userData.fcmTokens)) {
                    tokens.push(...userData.fcmTokens);
                }
            }
        });

        if (tokens.length > 0) {
            const payload = {
                notification: {
                    title: `New message in ${groupName}`,
                    body: `${message.userName}: ${message.message}`,
                    click_action: `${process.env.NEXT_PUBLIC_BASE_URL}/chat/${groupId}`,
                    icon: '/icon-192x192.png'
                }
            };
            // Use getMessaging() for FCM
            const { getMessaging } = require('firebase-admin/messaging');
            await getMessaging().sendToDevice(tokens, payload);
        }

        res.status(200).json({ message: 'Notifications sent successfully.' });

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        console.error('Error sending chat notifications:', error);
        res.status(500).json({ message: 'An error occurred while sending notifications.' });
    }
}
