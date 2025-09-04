import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '../../styles/Home.module.css';
import galleryStyles from '../../styles/Gallery.module.css';
import BottomNav from '../../components/BottomNav';

export default function InstagramGalleryPage() {
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchInstagramPhotos = async () => {
            try {
                setLoading(true);
                const res = await fetch('/api/gallery/instagram-feed');
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.message || 'Failed to fetch Instagram feed');
                }
                const data = await res.json();
                setPhotos(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchInstagramPhotos();
    }, []);

    return (
        <div className={styles.pageContainer}>
            <header className={styles.header}>
                <h1>From Our Instagram</h1>
                <p>Latest posts from our Instagram feed. <a href="https://www.instagram.com/mentonelifesavingclub" target="_blank" rel="noopener noreferrer">Follow us!</a></p>
            </header>
            <div className={styles.container}>
                <div className={galleryStyles.adminControls}>
                    <Link href="/gallery" className={styles.button}>&larr; Back to Albums</Link>
                </div>

                {loading && <p>Loading photos...</p>}
                {error && <p className={styles.error}>{error}</p>}

                <div className={galleryStyles.photoGrid}>
                    {photos.map(photo => (
                        <a key={photo.id} href={photo.url} target="_blank" rel="noopener noreferrer" className={galleryStyles.photoCard}>
                            <img src={photo.src} alt={photo.alt} />
                            <div className={galleryStyles.photoOverlay}>
                                <span>❤️ {photo.likes}</span>
                                <span>💬 {photo.comments}</span>
                            </div>
                        </a>
                    ))}
                </div>

                {!loading && photos.length === 0 && !error && (
                    <p>No photos to display. The feed might be empty or disabled.</p>
                )}
            </div>
            <BottomNav />
        </div>
    );
}
