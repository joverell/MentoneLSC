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
    const [instagramAlbum, setInstagramAlbum] = useState(null);

    // State for creating a new album
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newAlbumTitle, setNewAlbumTitle] = useState('');
    const [newAlbumDescription, setNewAlbumDescription] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        const fetchAlbumsAndSettings = async () => {
            setLoading(true);
            try {
                // Fetch regular albums
                const albumsRes = await fetch('/api/gallery/albums');
                if (!albumsRes.ok) throw new Error('Failed to fetch albums');
                const albumsData = await albumsRes.json();
                setAlbums(albumsData);

                // Fetch settings to check for Instagram integration
                const settingsRes = await fetch('/api/settings');
                if (settingsRes.ok) {
                    const settingsData = await settingsRes.json();
                    if (settingsData.instagram?.enabled) {
                        // If enabled, fetch the feed to create a virtual album
                        const instaRes = await fetch('/api/gallery/instagram-feed');
                        if (instaRes.ok) {
                            const instaData = await instaRes.json();
                            if (instaData.length > 0) {
                                setInstagramAlbum({
                                    id: 'instagram-feed',
                                    title: 'From Our Instagram',
                                    coverImageUrl: instaData[0].thumbnail_src,
                                });
                            }
                        }
                    }
                }
            } catch (err) {
                // Don't let a failed instagram fetch kill the whole page
                console.error("Error fetching gallery data:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchAlbumsAndSettings();
    }, []);

    const fetchAlbums = async () => {
        try {
            const res = await fetch('/api/gallery/albums');
            if (!res.ok) throw new Error('Failed to fetch albums');
            const data = await res.json();
            setAlbums(data);
        } catch (err) {
            setError(err.message);
        }
    };

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
            fetchAlbums(); // Refetch albums after creation
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
                    {instagramAlbum && (
                        <Link key={instagramAlbum.id} href="/gallery/instagram" className={galleryStyles.albumCard}>
                             <div className={galleryStyles.albumImageWrapper}>
                                <img
                                    src={instagramAlbum.coverImageUrl || 'https://via.placeholder.com/400x300?text=Instagram'}
                                    alt={instagramAlbum.title}
                                />
                            </div>
                            <div className={galleryStyles.albumTitle}>
                                {instagramAlbum.title}
                            </div>
                        </Link>
                    )}
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

                {!loading && albums.length === 0 && !instagramAlbum && (
                    <p>No photo albums have been created yet.</p>
                )}
            </div>
            <BottomNav />
        </div>
    );
}
