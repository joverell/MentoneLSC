import { useState } from 'react';
import styles from '../styles/Form.module.css';

const GalleryUploadForm = ({ albumId, onUploadSuccess }) => {
    const [caption, setCaption] = useState('');
    const [photoFile, setPhotoFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);

    const handleFileChange = (e) => {
        setPhotoFile(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!photoFile) {
            setError('Please select a photo to upload.');
            return;
        }

        setUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('photo', photoFile);
        formData.append('caption', caption);
        formData.append('albumId', albumId);

        try {
            const res = await fetch(`/api/upload`, {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to upload photo');

            setCaption('');
            setPhotoFile(null);
            // Clear the file input visually
            if (document.getElementById('photo-upload')) {
                document.getElementById('photo-upload').value = '';
            }
            onUploadSuccess();
        } catch (err) {
            setError(err.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <form className={styles.form} onSubmit={handleSubmit}>
            <h3>Upload New Photo</h3>
            <div className={styles.formGroup}>
                <label htmlFor="photo-upload">Photo</label>
                <input
                    type="file"
                    id="photo-upload"
                    onChange={handleFileChange}
                    className={styles.input}
                    accept="image/*"
                />
            </div>
            <div className={styles.formGroup}>
                <label htmlFor="caption">Caption (optional)</label>
                <input
                    type="text"
                    id="caption"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className={styles.input}
                />
            </div>
            <button type="submit" className={styles.button} disabled={uploading}>
                {uploading ? 'Uploading...' : 'Upload Photo'}
            </button>
            {error && <p className={styles.error}>{error}</p>}
        </form>
    );
};

export default GalleryUploadForm;
