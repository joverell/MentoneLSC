import { adminDb, adminStorage } from '@/src/firebase-admin';
import { withAuth } from '@/utils/api-auth';
import { parseForm } from '@/utils/fileUploadParser';

// Disable the default body parser for file uploads
export const config = {
    api: {
        bodyParser: false,
    },
};

const handler = async (req, res) => {
    const { albumId } = req.query;

    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    // Use a wrapper for authentication and authorization
    // Assumes withAuth middleware adds a `user` object to the request
    if (!req.user || !req.user.roles.includes('Admin')) {
        return res.status(403).json({ message: 'Forbidden: You do not have permission to upload photos.' });
    }

    try {
        const { fields, files } = await parseForm(req);
        // formidable can return a single file or an array of files
        const uploadedFiles = files.files ? (Array.isArray(files.files) ? files.files : [files.files]) : [];
        const captions = JSON.parse(fields.captions || '{}');

        if (uploadedFiles.length === 0) {
            return res.status(400).json({ message: 'No files selected for upload.' });
        }

        const bucket = adminStorage.bucket();

        const uploadPromises = uploadedFiles.map(async (file, index) => {
            if (!file || !file.originalFilename || file.size === 0) {
                // Skip empty file fields
                return null;
            }

            const safeFileName = file.originalFilename.replace(/[^a-zA-Z0-9.]/g, '_');
            const fileName = `${Date.now()}-${safeFileName}`;
            const filePath = `gallery/${albumId}/${fileName}`;

            // Upload the file to Firebase Storage
            await bucket.upload(file.filepath, {
                destination: filePath,
                public: true, // Make the file publicly readable
                metadata: {
                    contentType: file.mimetype,
                    // Cache control can be useful in production
                    // cacheControl: 'public, max-age=31536000',
                },
            });

            // Construct the public URL
            const downloadURL = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

            // Save photo metadata to Firestore
            const photoDocRef = adminDb.collection('photo_albums').doc(albumId).collection('photos').doc();
            await photoDocRef.set({
                downloadURL,
                storagePath: filePath, // CRUCIAL: Store the path for deletion
                fileName,
                caption: captions[index] || '',
                createdAt: new Date().toISOString(),
                createdBy: req.user.uid,
            });
            return {fileName, downloadURL};
        });

        const results = await Promise.all(uploadPromises);
        const successfulUploads = results.filter(r => r !== null);

        res.status(200).json({
            message: `${successfulUploads.length} photos uploaded successfully.`,
            uploads: successfulUploads
        });

    } catch (error) {
        console.error('Photo upload error:', error);
        res.status(500).json({ message: 'An error occurred during photo upload.' });
    }
};

// Wrap the handler with authentication middleware
export default withAuth(handler);
