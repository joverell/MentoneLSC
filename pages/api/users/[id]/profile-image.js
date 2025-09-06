import { adminDb, adminStorage } from '@/src/firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { parse as parseCookie } from 'cookie';
import { parseForm } from '@/utils/fileUploadParser';
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

    const { id: targetUserId } = req.query;
    const cookies = parseCookie(req.headers.cookie || '');
    const token = cookies.auth_token;

    if (!token) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    let filePath;

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.userId !== targetUserId) {
            return res.status(403).json({ message: 'Forbidden: You can only update your own profile picture.' });
        }

        const { files } = await parseForm(req);
        const photoFile = files.photo?.[0];

        if (!photoFile) {
            return res.status(400).json({ message: 'No photo uploaded.' });
        }

        filePath = photoFile.filepath;
        const bucket = adminStorage.bucket();
        const fileExt = photoFile.originalFilename.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const destination = `profile-photos/${targetUserId}/${fileName}`;

        await bucket.upload(filePath, {
            destination: destination,
            metadata: {
                contentType: photoFile.mimetype,
            },
        });

        const fileRef = bucket.file(destination);
        const [url] = await fileRef.getSignedUrl({
            action: 'read',
            expires: '03-09-2491',
        });

        const userDocRef = adminDb.collection('users').doc(targetUserId);
        await userDocRef.update({ photoURL: url });

        return res.status(200).json({ photoURL: url });

    } catch (error) {
        console.error('Profile Image Upload API Error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        return res.status(500).json({ message: 'An error occurred during the file upload process.' });
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
