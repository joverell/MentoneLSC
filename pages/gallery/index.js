import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';
import styles from '../../styles/Home.module.css';
import galleryStyles from '../../styles/Gallery.module.css';
import BottomNav from '../../components/BottomNav';

export default function GalleryPage() {
    const { user } = useAuth();
    const [albums, setAlbums] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // State for creating a new album
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newAlbumTitle, setNewAlbumTitle] = useState('');
    const [newAlbumDescription, setNewAlbumDescription] = useState('');
    const [creating, setCreating] = useState(false);

    const fetchAlbums = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/gallery/albums');
            if (!res.ok) throw new Error('Failed to fetch albums');
            const data = await res.json();
            setAlbums(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlbums();
    }, []);

    const handleCreateAlbum = async (e) => {
        e.preventDefault();
        setCreating(true);
        setError(null);
        try {
            const res = await fetch('/api/gallery/albums', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: newAlbumTitle, description: newAlbumDescription }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to create album');

            // Reset form and refresh albums
            setNewAlbumTitle('');
            setNewAlbumDescription('');
            setShowCreateForm(false);
            fetchAlbums();
        } catch (err) {
            setError(err.message);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className={styles.pageContainer}>
            <header className={styles.header}>
                <h1>Photo Gallery</h1>
            </header>
            <div className={styles.container}>
                {user && user.roles.includes('Admin') && (
                    <div className={galleryStyles.adminControls}>
                        <button onClick={() => setShowCreateForm(!showCreateForm)} className={styles.button}>
                            {showCreateForm ? 'Cancel' : '+ Create New Album'}
                        </button>
                    </div>
                )}

                {showCreateForm && (
                    <form onSubmit={handleCreateAlbum} className={galleryStyles.createForm}>
                        <h3>New Album</h3>
                        <input
                            type="text"
                            placeholder="Album Title"
                            value={newAlbumTitle}
                            onChange={(e) => setNewAlbumTitle(e.target.value)}
                            required
                        />
                        <textarea
                            placeholder="Album Description (optional)"
                            value={newAlbumDescription}
                            onChange={(e) => setNewAlbumDescription(e.target.value)}
                        />
                        <button type="submit" disabled={creating} className={styles.button}>
                            {creating ? 'Creating...' : 'Create Album'}
                        </button>
                    </form>
                )}

                {loading && <p>Loading albums...</p>}
                {error && <p className={styles.error}>{error}</p>}

                <div className={galleryStyles.albumGrid}>
                    {albums.map(album => (
                        <Link key={album.id} href={`/gallery/${album.id}`} className={galleryStyles.albumCard}>
                            <div className={galleryStyles.albumImageWrapper}>
                                <img
                                    src={album.coverImageUrl || 'https://via.placeholder.com/400x300?text=No+Photos'}
                                    alt={album.title}
                                />
                            </div>
                            <div className={galleryStyles.albumTitle}>
                                {album.title}
                            </div>
                        </Link>
                    ))}
                </div>

                {!loading && albums.length === 0 && (
                    <p>No photo albums have been created yet.</p>
                )}
            </div>
            <BottomNav />
        </div>
    );
}
