import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';
import styles from '../../styles/Home.module.css';
import galleryStyles from '../../styles/Gallery.module.css';
import GalleryUploadForm from '../../components/GalleryUploadForm';
import { FaThumbsUp } from 'react-icons/fa';

export default function AlbumPage() {
    const { user } = useAuth();
    const router = useRouter();
    const { albumId } = router.query;

    const [album, setAlbum] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [likeCount, setLikeCount] = useState(0);
    const [userHasLiked, setUserHasLiked] = useState(false);

    const fetchAlbumDetails = useCallback(async () => {
        if (!albumId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/gallery/albums/${albumId}`);
            if (!res.ok) throw new Error('Failed to fetch album details');
            const data = await res.json();
            setAlbum(data);
            setLikeCount(data.likeCount || 0);
            setUserHasLiked(data.likes?.includes(user?.uid));
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [albumId, user]);

    useEffect(() => {
        fetchAlbumDetails();
    }, [fetchAlbumDetails]);

    const handleLike = async () => {
        if (!user) {
            alert('You must be logged in to like an album.');
            return;
        }

        const originalLikeCount = likeCount;
        const originalUserHasLiked = userHasLiked;

        // Optimistic update
        setLikeCount(userHasLiked ? likeCount - 1 : likeCount + 1);
        setUserHasLiked(!userHasLiked);

        try {
            const res = await fetch(`/api/gallery/albums/${albumId}/like`, {
                method: 'POST',
            });

            if (!res.ok) {
                // Revert on failure
                setLikeCount(originalLikeCount);
                setUserHasLiked(originalUserHasLiked);
                const errorData = await res.json();
                alert(errorData.message || 'Failed to update like status.');
            } else {
                const data = await res.json();
                setLikeCount(data.newCount);
                setUserHasLiked(data.liked);
            }
        } catch (err) {
            // Revert on failure
            setLikeCount(originalLikeCount);
            setUserHasLiked(originalUserHasLiked);
            alert('An error occurred while liking the album.');
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
            const res = await fetch(`/api/gallery/albums/${albumId}/photos/${photoId}`, { method: 'DELETE' });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({})); // try to get error message from body
                throw new Error(errorData.message || `Failed to delete photo. Server responded with ${res.status}`);
            }

            // Deletion was successful, now refresh the album details
            fetchAlbumDetails();
        } catch (err) {
            setError(err.message);
        }
    };

    if (loading) return <p>Loading...</p>;
    if (error) return <p className={styles.error}>{error}</p>;
    if (!album) return <p>Album not found.</p>;

    return (
        <>
            <header className={styles.header}>
                <h1>{album.title}</h1>
                <p>{album.description}</p>
                 <div className={galleryStyles.albumActions}>
                    <button onClick={handleLike} disabled={!user} className={`${galleryStyles.likeButton} ${userHasLiked ? galleryStyles.liked : ''}`} title={!user ? "Log in to like albums" : (userHasLiked ? 'Unlike' : 'Like')}>
                        <FaThumbsUp /> <span>{likeCount}</span>
                    </button>
                </div>
            </header>
            <div className={styles.container}>
                <div className={galleryStyles.adminControls}>
                    <Link href="/gallery" className={styles.button}>&larr; Back to Albums</Link>
                    {user && user.roles.includes('Admin') && (
                         <button onClick={handleDeleteAlbum} className={styles.button} style={{backgroundColor: '#e53e3e'}}>Delete Album</button>
                    )}
                </div>

                {user && user.roles.includes('Admin') && (
                    <GalleryUploadForm
                        albumId={albumId}
                        onUploadSuccess={fetchAlbumDetails}
                    />
                )}

                <div className={galleryStyles.photoGrid}>
                    {album.photos.map(photo => (
                        <div key={photo.id} className={galleryStyles.photoCard}>
                            <img src={photo.downloadURL} alt={photo.caption || 'Gallery image'} />
                            {photo.caption && (
                                <div className={galleryStyles.captionContainer}>
                                    <p className={galleryStyles.caption}>{photo.caption}</p>
                                </div>
                            )}
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
        </>
    );
}

export async function getStaticPaths() {
    return {
        paths: [],
        fallback: 'blocking',
    };
}

export async function getStaticProps({ params }) {
    // Fetch album data based on params.albumId if needed, or just pass title
    // For now, we just pass a generic title, as the title is fetched client-side
    return {
        props: {
            title: 'Album Details',
        },
    };
}
