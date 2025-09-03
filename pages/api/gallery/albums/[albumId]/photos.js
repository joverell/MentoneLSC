import { adminDb, adminStorage } from '../../../../../src/firebase-admin';
import admin from 'firebase-admin';
import jwt from 'jsonwebtoken';
import { parse as parseCookie } from 'cookie';
import { formidable } from 'formidable';
import fs from 'fs';

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

    // 1. Authenticate and Authorize Admin
    const cookies = parseCookie(req.headers.cookie || '');
    const token = cookies.auth_token;
    if (!token) return res.status(401).json({ message: 'Not authenticated' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded.roles || !decoded.roles.includes('Admin')) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission.' });
        }

        const { albumId } = req.query;
        if (!albumId) {
            return res.status(400).json({ message: 'Album ID is required.' });
        }

        // 2. Parse Form Data
        const form = formidable({});
        const [fields, files] = await form.parse(req);

        const caption = fields.caption?.[0] || '';
        const file = files.file?.[0];

        if (!file) {
            return res.status(400).json({ message: 'File is required.' });
        }

        // 3. Upload File to Firebase Storage
        const bucket = adminStorage.bucket();
        const filePath = file.filepath;
        const fileName = `${Date.now()}-${file.originalFilename}`;
        const destination = `gallery/${albumId}/${fileName}`;

        await bucket.upload(filePath, {
            destination: destination,
            metadata: {
                contentType: file.mimetype,
            },
        });

        const fileRef = bucket.file(destination);
        await fileRef.makePublic();
        const downloadURL = fileRef.publicUrl();

        // 4. Save Photo Metadata to Firestore
        const albumRef = adminDb.collection('photo_albums').doc(albumId);
        const newPhotoRef = albumRef.collection('photos').doc();

        await newPhotoRef.set({
            caption,
            downloadURL,
            storagePath: destination,
            mimetype: file.mimetype,
            size: file.size,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: decoded.uid,
        });

        // 5. Update album's cover image if it's not set
        const albumSnap = await albumRef.get();
        if (!albumSnap.data().coverImageUrl) {
            await albumRef.update({ coverImageUrl: downloadURL });
        }

        return res.status(201).json({ message: 'Photo uploaded successfully.' });

    } catch (error) {
        console.error('Upload Photo Error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        return res.status(500).json({ message: 'An error occurred during photo upload.' });
    }
}
