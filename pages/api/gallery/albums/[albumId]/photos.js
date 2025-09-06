import { adminDb, adminStorage } from '@/src/firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import { parseForm } from '@/utils/fileUploadParser';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { parse as parseCookie } from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET;

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const cookies = parseCookie(req.headers.cookie || '');
    const token = cookies.auth_token;
    if (!token) return res.status(401).json({ message: 'Not authenticated' });

    let filePath;

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded.roles || !decoded.roles.includes('Admin')) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission.' });
        }

        const { albumId } = req.query;
        const { files } = await parseForm(req);
        const photoFile = files.photo?.[0];

        if (!photoFile) {
            return res.status(400).json({ message: 'No photo uploaded.' });
        }

        filePath = photoFile.filepath;
        const bucket = adminStorage.bucket();
        const fileExt = photoFile.originalFilename.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;

        const destination = `gallery/${albumId}/${fileName}`;

        await bucket.upload(filePath, {
            destination: destination,
        });

        const fileRef = bucket.file(destination);
        const [url] = await fileRef.getSignedUrl({
            action: 'read',
            expires: '03-09-2491',
        });

        const photoData = {
            id: uuidv4(),
            albumId,
            fileName,
            downloadURL: url,
            uploadedAt: new Date().toISOString(),
            createdBy: decoded.userId,
        };

        const albumRef = adminDb.collection('gallery_albums').doc(albumId);
        const albumDoc = await albumRef.get();

        if (!albumDoc.exists) {
            // If album doesn't exist, we can't add photos to it.
            return res.status(404).json({ message: 'Album not found' });
        }

        // Add photo data to the 'photos' subcollection
        await albumRef.collection('photos').add(photoData);

        // Optionally, update a 'lastUpdated' field or photo count on the album
        await albumRef.update({
            lastUpdated: new Date().toISOString(),
        });

        res.status(201).json(photoData);

    } catch (error) {
        console.error('Error uploading photo:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        res.status(500).json({ message: 'An error occurred during the file upload process' });
    } finally {
        if (filePath) {
            try {
                fs.unlinkSync(filePath);
            } catch (unlinkError) {
                console.error('Error deleting temporary file:', unlinkError);
            }
        }
    }
}
