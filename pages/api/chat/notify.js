import { adminDb } from '../../../src/firebase-admin';
import { getMessaging } from 'firebase-admin/messaging';
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
        const senderId = decoded.userId;
        const { groupId, message } = req.body;

        if (!groupId || !message) {
            return res.status(400).json({ message: 'Missing groupId or message' });
        }

        const groupRef = adminDb.collection('chats').doc(groupId);
        const groupDoc = await groupRef.get();
        if (!groupDoc.exists) {
            return res.status(404).json({ message: 'Group not found' });
        }
        const groupName = groupDoc.data().name;

        const notifiedUserIds = new Set();

        // Handle @mentions
        const mentionRegex = /@(\w+)/g;
        const mentions = message.message.match(mentionRegex);
        if (mentions) {
            const mentionedUsernames = mentions.map(m => m.substring(1));
            const usersSnapshot = await adminDb.collection('users').where('name', 'in', mentionedUsernames).get();
            usersSnapshot.forEach(doc => {
                if (doc.id !== senderId) {
                    notifiedUserIds.add(doc.id);
                }
            });
        }

        // Handle replies
        if (message.replyTo) {
            const originalMessageRef = adminDb.collection('chats').doc(groupId).collection('messages').doc(message.replyTo);
            const originalMessageDoc = await originalMessageRef.get();
            if (originalMessageDoc.exists) {
                const originalMessageData = originalMessageDoc.data();
                if (originalMessageData.userId !== senderId) {
                    notifiedUserIds.add(originalMessageData.userId);
                }
            }
        }

        // Send notifications to mentioned/replied users
        notifiedUserIds.forEach(async (userId) => {
            const userDoc = await adminDb.collection('users').doc(userId).get();
            const userData = userDoc.data();
            if (userData.fcmTokens && userData.fcmTokens.length > 0) {
                const payload = {
                    notification: {
                        title: `New reply or mention in ${groupName}`,
                        body: `${message.userName}: ${message.message}`,
                        click_action: `${process.env.NEXT_PUBLIC_BASE_URL}/chat/${groupId}`,
                        icon: '/icon-192x192.png'
                    }
                };
                await getMessaging().sendToDevice(userData.fcmTokens, payload);
            }
        });

        // Send general notification to other group members
        const groupMembersSnapshot = await adminDb.collection('users').where('groupIds', 'array-contains', groupId).get();
        const tokens = [];
        groupMembersSnapshot.forEach(doc => {
            const userData = doc.data();
            const wantsChatNotifs = (userData.notificationSettings && userData.notificationSettings.chat !== undefined) ? userData.notificationSettings.chat : true;
            if (wantsChatNotifs && userData.fcmTokens && doc.id !== senderId && !notifiedUserIds.has(doc.id)) {
                if (Array.isArray(userData.fcmTokens)) {
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
