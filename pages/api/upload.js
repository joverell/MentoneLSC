import { adminDb, adminStorage } from '@/src/firebase-admin.js';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { parse as parseCookie } from 'cookie';
import { parseForm } from '@/utils/fileUploadParser.js';
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

    let filePath; // To hold the path of the temporary file

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded.userId) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission.' });
        }

        const { fields, files } = await parseForm(req);

        const albumId = fields.albumId?.[0];
        const caption = fields.caption?.[0] || '';
        const photoFile = files.photo?.[0];

        if (!albumId) {
            return res.status(400).json({ message: 'Album ID is required.' });
        }
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
            metadata: {
                contentType: photoFile.mimetype,
            },
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
            caption: caption,
            uploadedAt: new Date().toISOString(),
            createdBy: decoded.userId,
            storagePath: destination,
        };

        const albumRef = adminDb.collection('photo_albums').doc(albumId);
        const albumDoc = await albumRef.get();

        if (!albumDoc.exists) {
            // If album doesn't exist, we can't add photos to it.
            return res.status(404).json({ message: 'Album not found' });
        }

        // Add photo data to the 'photos' subcollection
        await albumRef.collection('photos').add(photoData);

        // Update the album's cover image if it doesn't have one
        if (!albumDoc.data().coverImageUrl) {
            await albumRef.update({
                coverImageUrl: url,
                lastUpdated: new Date().toISOString(),
            });
        } else {
            await albumRef.update({
                lastUpdated: new Date().toISOString(),
            });
        }


        return res.status(201).json(photoData);

    } catch (error) {
        console.error('Upload API Error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        return res.status(500).json({ message: 'An error occurred during the file upload process.' });
    } finally {
        // Clean up the temporary file if it exists
        if (filePath) {
            try {
                fs.unlinkSync(filePath);
            } catch (unlinkError) {
                console.error('Error deleting temporary file:', unlinkError);
            }
        }
    }
}
