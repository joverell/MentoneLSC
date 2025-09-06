import { adminDb, adminStorage } from '../../../src/firebase-admin';
import admin from 'firebase-admin';
import jwt from 'jsonwebtoken';
import { parse as parseCookie } from 'cookie';
import { parseForm, fileUploadConfig } from '../../../utils/fileUploadParser';
import fs from 'fs';

const JWT_SECRET = process.env.JWT_SECRET;

export const config = fileUploadConfig;

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

    let logoFilepath;

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded.roles || !decoded.roles.includes('Admin')) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission.' });
        }

        const { fields, files } = await parseForm(req);

        const name = fields.name?.[0];
        const websiteUrl = fields.websiteUrl?.[0];
        const logoFile = files.logo?.[0];

        if (!name || !websiteUrl || !logoFile) {
            return res.status(400).json({ message: 'Name, website URL, and logo file are required.' });
        }

        logoFilepath = logoFile.filepath;
        const bucket = adminStorage.bucket();
        const destination = `sponsors/${Date.now()}-${logoFile.originalFilename}`;

        await bucket.upload(logoFilepath, {
            destination: destination,
            metadata: { contentType: logoFile.mimetype },
        });

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

    } catch (error) {
        console.error('Create Sponsor Error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        return res.status(500).json({ message: 'An error occurred during sponsor creation.' });
    } finally {
        if (logoFilepath) {
            try {
                fs.unlinkSync(logoFilepath);
            } catch (unlinkError) {
                console.error('Error deleting temporary file:', unlinkError);
            }
        }
    }
}
