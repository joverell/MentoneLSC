import { adminStorage } from '../../src/firebase-admin';
import jwt from 'jsonwebtoken';
import { parse as parseCookie } from 'cookie';
import formidable from 'formidable';
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

    const cookies = parseCookie(req.headers.cookie || '');
    const token = cookies.auth_token;
    if (!token) return res.status(401).json({ message: 'Not authenticated' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded.userId) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission.' });
        }

        const form = formidable({});

        try {
            const [fields, files] = await form.parse(req);

            const folder = fields.folder?.[0] || 'general';
            const file = files.file?.[0];

            if (!file) {
                return res.status(400).json({ message: 'File is required.' });
            }

            const bucket = adminStorage.bucket();
            const filePath = file.filepath;
            const fileName = `${Date.now()}-${file.originalFilename}`;
            const destination = `${folder}/${fileName}`;

            await bucket.upload(filePath, {
                destination: destination,
                metadata: {
                    contentType: file.mimetype,
                },
            });

            fs.unlinkSync(filePath);

            const fileRef = bucket.file(destination);
            const [downloadURL] = await fileRef.getSignedUrl({
                action: 'read',
                expires: '03-09-2491', // A long, long time in the future
            });

            return res.status(201).json({ downloadURL });

        } catch (uploadError) {
            console.error('Upload Process Error:', uploadError);
            if (uploadError.name === 'FormidableError') {
                return res.status(500).json({ message: 'Error parsing form data.' });
            }
            return res.status(500).json({ message: 'An error occurred during the file upload process.' });
        }
    } catch (error) {
        console.error('Authentication or Permission Error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        return res.status(500).json({ message: 'An error occurred during the request.' });
    }
}
