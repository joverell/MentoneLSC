import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';
import styles from '../../styles/Home.module.css';
import galleryStyles from '../../styles/Gallery.module.css';
import BottomNav from '../../components/BottomNav';

export default function AlbumPage() {
    const { user } = useAuth();
    const router = useRouter();
    const { albumId } = router.query;

    const [album, setAlbum] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // State for uploading a new photo
    const [file, setFile] = useState(null);
    const [caption, setCaption] = useState('');
    const [uploading, setUploading] = useState(false);

    const fetchAlbumDetails = useCallback(async () => {
        if (!albumId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/gallery/albums/${albumId}`);
            if (!res.ok) throw new Error('Failed to fetch album details');
            const data = await res.json();
            setAlbum(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [albumId]);

    useEffect(() => {
        fetchAlbumDetails();
    }, [fetchAlbumDetails]);

    const handleUploadPhoto = async (e) => {
        e.preventDefault();
        if (!file) return;
        setUploading(true);
        setError(null);
        const formData = new FormData();
        formData.append('caption', caption);
        formData.append('file', file);

        try {
            const res = await fetch(`/api/gallery/albums/${albumId}/photos`, {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Upload failed');
            setCaption('');
            setFile(null);
            e.target.reset();
            fetchAlbumDetails(); // Refresh album
        } catch (err) {
            setError(err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteAlbum = async () => {
        if (!window.confirm('Are you sure you want to delete this entire album and all its photos? This cannot be undone.')) return;
        try {
            await fetch(`/api/gallery/albums/${albumId}`, { method: 'DELETE' });
            router.push('/gallery');
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDeletePhoto = async (photoId) => {
        if (!window.confirm('Are you sure you want to delete this photo?')) return;
        try {
            await fetch(`/api/gallery/albums/${albumId}/photos/${photoId}`, { method: 'DELETE' });
            fetchAlbumDetails(); // Refresh album to show photo has been removed
        } catch (err) {
            setError(err.message);
        }
    };

    if (loading) return <p>Loading...</p>;
    if (error) return <p className={styles.error}>{error}</p>;
    if (!album) return <p>Album not found.</p>;

    return (
        <div className={styles.pageContainer}>
            <header className={styles.header}>
                <h1>{album.title}</h1>
                <p>{album.description}</p>
            </header>
            <div className={styles.container}>
                <div className={galleryStyles.adminControls}>
                    <Link href="/gallery" className={styles.button}>&larr; Back to Albums</Link>
                    {user && user.roles.includes('Admin') && (
                         <button onClick={handleDeleteAlbum} className={styles.button} style={{backgroundColor: '#e53e3e'}}>Delete Album</button>
                    )}
                </div>

                {user && user.roles.includes('Admin') && (
                    <form onSubmit={handleUploadPhoto} className={galleryStyles.createForm}>
                        <h3>Upload New Photo</h3>
                        <input type="file" onChange={(e) => setFile(e.target.files[0])} required />
                        <input type="text" placeholder="Optional caption" value={caption} onChange={(e) => setCaption(e.target.value)} />
                        <button type="submit" disabled={uploading} className={styles.button}>
                            {uploading ? 'Uploading...' : 'Upload Photo'}
                        </button>
                    </form>
                )}

                <div className={galleryStyles.photoGrid}>
                    {album.photos.map(photo => (
                        <div key={photo.id} className={galleryStyles.photoCard}>
                            <img src={photo.downloadURL} alt={photo.caption || 'Gallery image'} />
                            {user && user.roles.includes('Admin') && (
                                <button onClick={() => handleDeletePhoto(photo.id)} className={galleryStyles.deletePhotoBtn} title="Delete Photo">
                                    &times;
                                </button>
                            )}
                        </div>
                    ))}
                </div>
                {!loading && album.photos.length === 0 && (
                    <p>This album is empty. Admins can upload photos.</p>
                )}
            </div>
            <BottomNav />
        </div>
    );
}
