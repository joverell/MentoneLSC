import { adminDb, adminStorage } from '../../../src/firebase-admin';
import admin from 'firebase-admin';
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
    if (req.method === 'GET') {
        return getSponsors(req, res);
    } else if (req.method === 'POST') {
        return createSponsor(req, res);
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}

async function getSponsors(req, res) {
    try {
        const sponsorsSnapshot = await adminDb.collection('sponsors').orderBy('name').get();
        const sponsors = sponsorsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));
        return res.status(200).json(sponsors);
    } catch (error) {
        console.error('Get Sponsors Error:', error);
        return res.status(500).json({ message: 'An error occurred while fetching sponsors.' });
    }
}

async function createSponsor(req, res) {
    const cookies = parseCookie(req.headers.cookie || '');
    const token = cookies.auth_token;
    if (!token) return res.status(401).json({ message: 'Not authenticated' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded.roles || !decoded.roles.includes('Admin')) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission.' });
        }

        const form = formidable({});

        try {
            const [fields, files] = await form.parse(req);

            const name = fields.name?.[0];
            const websiteUrl = fields.websiteUrl?.[0];
            const logoFile = files.logo?.[0];

            if (!name || !websiteUrl || !logoFile) {
                return res.status(400).json({ message: 'Name, website URL, and logo file are required.' });
            }

            const bucket = adminStorage.bucket();
            const destination = `sponsors/${Date.now()}-${logoFile.originalFilename}`;

            await bucket.upload(logoFile.filepath, {
                destination: destination,
                metadata: { contentType: logoFile.mimetype },
            });

            fs.unlinkSync(logoFile.filepath);

            const fileRef = bucket.file(destination);
            const [logoUrl] = await fileRef.getSignedUrl({
                action: 'read',
                expires: '03-09-2491',
            });

            await adminDb.collection('sponsors').add({
                name,
                websiteUrl,
                logoUrl,
                storagePath: destination,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            return res.status(201).json({ message: 'Sponsor created successfully.' });

        } catch (uploadError) {
            console.error('Upload Process Error:', uploadError);
            if (uploadError.name === 'FormidableError') {
                return res.status(500).json({ message: 'Error parsing form data.' });
            }
            return res.status(500).json({ message: 'An error occurred during the file upload process.' });
        }
    } catch (error) {
        console.error('Create Sponsor Error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        return res.status(500).json({ message: 'An error occurred during sponsor creation.' });
    }
}
