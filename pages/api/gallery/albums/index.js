import { adminDb } from '../../../../src/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET;

export default async function handler(req, res) {
    if (req.method === 'GET') {
        return getAlbums(req, res);
    } else if (req.method === 'POST') {
        return createAlbum(req, res);
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}

async function getAlbums(req, res) {
    let user = null;
    try {
        const cookies = parse(req.headers.cookie || '');
        const token = cookies.auth_token;
        if (token) {
            user = jwt.verify(token, JWT_SECRET);
        }
    } catch (err) {
        // User not logged in or token invalid
    }

    try {
        const albumsSnapshot = await adminDb.collection('photo_albums').orderBy('createdAt', 'desc').get();

        const albums = albumsSnapshot.docs
            .map(doc => {
                const albumData = doc.data();
                const isPublic = !albumData.visibleToGroups || albumData.visibleToGroups.length === 0;
                const isAdmin = user && user.roles && user.roles.includes('Admin');

                let canView = isPublic || isAdmin;

                if (!canView && user && user.groupIds) {
                    const userGroups = new Set(user.groupIds);
                    const albumGroups = new Set(albumData.visibleToGroups || []);
                    for (const group of albumGroups) {
                        if (userGroups.has(group)) {
                            canView = true;
                            break;
                        }
                    }
                }

                if (canView) {
                    return {
                        id: doc.id,
                        ...albumData,
                        createdAt: albumData.createdAt.toDate().toISOString(),
                    };
                }
                return null;
            })
            .filter(Boolean); // Filter out nulls

        return res.status(200).json(albums);
    } catch (error) {
        console.error('Get Albums Error:', error);
        return res.status(500).json({ message: 'An error occurred while fetching albums.' });
    }
}

async function createAlbum(req, res) {
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.auth_token;
    if (!token) return res.status(401).json({ message: 'Not authenticated' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const { roles, userId } = decoded;

        // Authorization: Allow Super Admins and Group Admins
        const isSuperAdmin = roles && roles.includes('Admin');
        const isGroupAdmin = roles && roles.includes('Group Admin');

        if (!isSuperAdmin && !isGroupAdmin) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission to create albums.' });
        }

        const { title, description, visibleToGroups } = req.body;
        if (!title) {
            return res.status(400).json({ message: 'Album title is required.' });
        }

        // If user is a Group Admin but not a Super Admin, they cannot create public albums
        if (!isSuperAdmin && (!visibleToGroups || visibleToGroups.length === 0)) {
            return res.status(403).json({ message: 'Forbidden: Only Super Admins can create public albums.' });
        }

        // Further check if Group Admin has rights over the selected groups
        if (isGroupAdmin && !isSuperAdmin) {
            const userDoc = await adminDb.collection('users').doc(userId).get();
            if (!userDoc.exists) {
                return res.status(404).json({ message: 'User not found.' });
            }
            const adminForGroups = userDoc.data().adminForGroups || [];
            const canAdminAllSelectedGroups = visibleToGroups.every(groupId => adminForGroups.includes(groupId));
            if (!canAdminAllSelectedGroups) {
                return res.status(403).json({ message: 'Forbidden: You do not have admin rights for all selected groups.' });
            }
        }

        const newAlbumRef = await adminDb.collection('photo_albums').add({
            title,
            description: description || '',
            visibleToGroups: visibleToGroups || [],
            coverImageUrl: null,
            createdAt: FieldValue.serverTimestamp(),
            createdBy: userId,
        });

        return res.status(201).json({ message: 'Album created successfully.', albumId: newAlbumRef.id });

    } catch (error) {
        console.error('Create Album Error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        return res.status(500).json({ message: 'An error occurred during album creation.' });
    }
}
