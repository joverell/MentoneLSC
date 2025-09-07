import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../../styles/Home.module.css';
import NewsArticle from './NewsArticle';

export default function NewsTab({ user }) {
    const router = useRouter();
    const [newsArticles, setNewsArticles] = useState([]);
    const [newsLoading, setNewsLoading] = useState(true);
    const [newsError, setNewsError] = useState(null);
    const [activeCommentSection, setActiveCommentSection] = useState(null);
    const [newComment, setNewComment] = useState('');

    const fetchNews = useCallback(async () => {
        setNewsLoading(true);
        try {
            const res = await fetch('/api/news');
            if (!res.ok) throw new Error('Failed to fetch news');
            const data = await res.json();
            setNewsArticles(data);
            setNewsError(null);
        } catch (err) {
            console.error(err);
            setNewsError('Could not load news. Please try again later.');
        } finally {
            setNewsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNews();
    }, [fetchNews]);

    const handleLikeClick = async (articleId) => {
        if (!user) {
            router.push('/account');
            return;
        }

        const originalArticles = [...newsArticles];
        const newArticles = newsArticles.map(article => {
            if (article.id === articleId) {
                const newLikeCount = article.currentUserHasLiked ? article.likeCount - 1 : article.likeCount + 1;
                return {
                    ...article,
                    likeCount: newLikeCount,
                    currentUserHasLiked: !article.currentUserHasLiked
                };
            }
            return article;
        });
        setNewsArticles(newArticles);

        try {
            const res = await fetch(`/api/news/${articleId}/like`, { method: 'POST' });
            if (!res.ok) {
                setNewsArticles(originalArticles);
                const data = await res.json();
                alert(data.message || "Failed to update like status.");
            }
        } catch (error) {
            setNewsArticles(originalArticles);
            alert("An error occurred. Please try again.");
        }
    };

    const fetchComments = async (articleId) => {
        setNewsArticles(prev => prev.map(a => a.id === articleId ? { ...a, commentsLoading: true } : a));
        try {
            const res = await fetch(`/api/news/${articleId}/comments`);
            if (!res.ok) throw new Error('Failed to fetch comments');
            const comments = await res.json();
            setNewsArticles(prev => prev.map(a => a.id === articleId ? { ...a, comments, commentsLoading: false } : a));
        } catch (err) {
            console.error("Error fetching comments:", err);
            setNewsArticles(prev => prev.map(a => a.id === articleId ? { ...a, commentsError: err.message, commentsLoading: false } : a));
        }
    };

    const toggleComments = (articleId) => {
        const article = newsArticles.find(a => a.id === articleId);
        if (activeCommentSection === articleId) {
            setActiveCommentSection(null);
        } else {
            setActiveCommentSection(articleId);
            if (!article.comments) {
                fetchComments(articleId);
            }
        }
    };

    const handleCommentSubmit = async (e, articleId) => {
        e.preventDefault();
        if (!user) {
            router.push('/account');
            return;
        }
        if (!newComment.trim()) return;

        const originalArticles = [...newsArticles];
        const tempComment = {
            id: `temp-${Date.now()}`,
            content: newComment,
            authorName: user.name,
            createdAt: new Date().toISOString(),
            isTemporary: true,
        };

        setNewsArticles(prev => prev.map(a => a.id === articleId ? { ...a, comments: [...(a.comments || []), tempComment] } : a));
        setNewComment('');

        try {
            const res = await fetch(`/api/news/${articleId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: newComment }),
            });

            const data = await res.json();

            if (!res.ok) {
                setNewsArticles(originalArticles);
                alert(data.message || 'Failed to post comment.');
                return;
            }

            setNewsArticles(prev => prev.map(a => a.id === articleId ? { ...a, comments: a.comments.map(c => c.id === tempComment.id ? data : c) } : a));

        } catch (error) {
            console.error("Error submitting comment:", error);
            setNewsArticles(originalArticles);
            alert('An error occurred while posting your comment. ' + error.message);
        }
    };

    return (
        <div id="news" className={styles.section}>
            <div className={styles.sectionHeader}>
                <h2>Club News</h2>
                {user && user.roles && (user.roles.includes('Admin') || user.roles.includes('Group Admin')) && (
                    <Link href="/create-news" className={styles.createEventBtn}>
                        + Create Article
                    </Link>
                )}
            </div>
            <div className={styles.newsContainer}>
                {newsLoading && <p>Loading news...</p>}
                {newsError && <p>{newsError}</p>}
                {!newsLoading && !newsError && newsArticles.length > 0 ? (
                    newsArticles.map(article => (
                        <NewsArticle
                            key={article.id}
                            article={article}
                            user={user}
                            onLikeClick={handleLikeClick}
                            onToggleComments={toggleComments}
                            onCommentSubmit={handleCommentSubmit}
                            onCommentChange={setNewComment}
                            activeCommentSection={activeCommentSection}
                            newComment={newComment}
                        />
                    ))
                ) : (
                    !newsLoading && !newsError && <p>No news articles found.</p>
                )}
            </div>
        </div>
    );
}
