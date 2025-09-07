import { adminDb, adminStorage } from '../../../src/firebase-admin';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import formidable from 'formidable';
import fs from 'fs';

const JWT_SECRET = process.env.JWT_SECRET;

export const config = {
    api: {
        bodyParser: false,
    },
};

const handlePut = async (req, res, decoded) => {
    const { id } = req.query;
    if (!id) {
        return res.status(400).json({ message: 'Sponsor ID is required.' });
    }

    const form = formidable({});
    try {
        const [fields, files] = await form.parse(req);
        const { name, websiteUrl } = fields;
        const logoFile = files.logo;

        const docRef = adminDb.collection('sponsors').doc(id);
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
            return res.status(404).json({ message: 'Sponsor not found.' });
        }
        const oldSponsorData = docSnap.data();

        let logoUrl = oldSponsorData.logoUrl;
        let storagePath = oldSponsorData.storagePath;

        if (logoFile) {
            // Delete old logo if it exists
            if (storagePath) {
                try {
                    await adminStorage.bucket().file(storagePath).delete();
                } catch (error) {
                    console.error(`Failed to delete old logo: ${storagePath}`, error);
                    // Not a fatal error, so we just log it.
                }
            }

            // Upload new logo
            const newLogoPath = `sponsors/${id}/${logoFile[0].originalFilename}`;
            await adminStorage.bucket().upload(logoFile[0].filepath, {
                destination: newLogoPath,
                metadata: {
                    contentType: logoFile[0].mimetype,
                },
            });
            fs.unlinkSync(logoFile[0].filepath); // Clean up temp file
            logoUrl = await adminStorage.bucket().file(newLogoPath).getSignedUrl({
                action: 'read',
                expires: '03-09-2491',
            }).then(urls => urls[0]);
            storagePath = newLogoPath;
        }

        const updatedData = {
            name: name[0],
            websiteUrl: websiteUrl[0],
            logoUrl,
            storagePath,
            updatedAt: new Date(),
        };

        await docRef.update(updatedData);

        res.status(200).json({ message: 'Sponsor updated successfully', sponsor: { id, ...updatedData } });
    } catch (error) {
        console.error('Update Sponsor Error:', error);
        res.status(500).json({ message: 'An error occurred during sponsor update.' });
    }
};

const handleDelete = async (req, res, decoded) => {
    const { id } = req.query;
    if (!id) {
        return res.status(400).json({ message: 'Sponsor ID is required.' });
    }

    const docRef = adminDb.collection('sponsors').doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
        return res.status(404).json({ message: 'Sponsor not found.' });
    }
    const sponsor = docSnap.data();

    if (sponsor.storagePath) {
        try {
            await adminStorage.bucket().file(sponsor.storagePath).delete();
        } catch (storageError) {
            console.error(`Failed to delete sponsor logo from storage: ${sponsor.storagePath}`, storageError);
        }
    }

    await docRef.delete();
    res.status(200).json({ message: 'Sponsor deleted successfully.' });
};

export default async function handler(req, res) {
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.auth_token;
    if (!token) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded.roles || !decoded.roles.includes('Admin')) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission.' });
        }

        switch (req.method) {
            case 'PUT':
                return await handlePut(req, res, decoded);
            case 'DELETE':
                return await handleDelete(req, res, decoded);
            default:
                res.setHeader('Allow', ['PUT', 'DELETE']);
                return res.status(405).end(`Method ${req.method} Not Allowed`);
        }
    } catch (error) {
        console.error('Sponsor API Error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        return res.status(500).json({ message: 'An internal server error occurred.' });
    }
}
