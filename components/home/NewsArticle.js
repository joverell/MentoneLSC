import Link from 'next/link';
import styles from '../../styles/Home.module.css';

export default function NewsArticle({ article, user, onLikeClick, onToggleComments, onCommentSubmit, onCommentChange, activeCommentSection, newComment }) {
    return (
        <div key={article.id} className={styles.newsArticle}>
            {article.imageUrl && <img src={article.imageUrl} alt={article.title} className={styles.newsImage} />}
            <h3>{article.title}</h3>
            <p className={styles.articleMeta}>
                By {article.authorName} on {new Date(article.createdAt).toLocaleDateString('en-AU')}
            </p>
            <div dangerouslySetInnerHTML={{ __html: article.content }} />
            <div className={styles.articleActions}>
                <button
                    onClick={() => onLikeClick(article.id)}
                    className={`${styles.likeButton} ${article.currentUserHasLiked ? styles.liked : ''}`}
                    disabled={!user}
                    title={!user ? "Log in to like posts" : ""}
                >
                    <span role="img" aria-label="like">👍</span> {article.likeCount}
                </button>
                <button onClick={() => onToggleComments(article.id)} className={styles.commentButton}>
                    <span role="img" aria-label="comment">💬</span> {article.commentCount}
                </button>
            </div>

            {activeCommentSection === article.id && (
                <div className={styles.commentsSection}>
                    {article.commentsLoading && <p>Loading comments...</p>}
                    {article.commentsError && <p className={styles.error}>{article.commentsError}</p>}
                    {article.comments && article.comments.length > 0 && (
                        <div className={styles.commentsList}>
                            {article.comments.map(comment => (
                                <div key={comment.id} className={`${styles.comment} ${comment.isTemporary ? styles.temporaryComment : ''}`}>
                                    <p><strong>{comment.authorName}</strong></p>
                                    <p>{comment.content}</p>
                                    <span className={styles.commentDate}>
                                        {new Date(comment.createdAt).toLocaleString('en-AU')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                    {article.comments && article.comments.length === 0 && <p>No comments yet.</p>}

                    {user ? (
                        <form onSubmit={(e) => onCommentSubmit(e, article.id)} className={styles.commentForm}>
                            <textarea
                                value={newComment}
                                onChange={(e) => onCommentChange(e.target.value)}
                                placeholder="Write a comment..."
                                rows="2"
                                required
                            />
                            <button type="submit">Post</button>
                        </form>
                    ) : (
                        <p>You must be <Link href="/account">logged in</Link> to comment.</p>
                    )}
                </div>
            )}
        </div>
    );
}
