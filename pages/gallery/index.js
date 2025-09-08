import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../../styles/Home.module.css';
import galleryStyles from '../../styles/Gallery.module.css';

import withAuth from '../../components/hoc/withAuth';

function GalleryPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [albums, setAlbums] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [instagramAlbum, setInstagramAlbum] = useState(null);

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
                console.error("Error fetching gallery data:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchAlbumsAndSettings();
    }, []);

    const canCreateAlbums = user && (user.roles.includes('Admin') || user.roles.includes('Group Admin'));

    return (
        <>
            <header className={styles.header}>
                <h1>Photo Gallery</h1>
            </header>
            <div className={styles.container}>
                {canCreateAlbums && (
                    <div className={galleryStyles.adminControls}>
                        <button onClick={() => router.push('/admin/gallery/create')} className={styles.button}>
                            + Create New Album
                        </button>
                    </div>
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
        </>
    );
}

export default withAuth(GalleryPage);

export async function getStaticProps() {
    return {
        props: {
            title: 'Gallery',
        },
    };
}
