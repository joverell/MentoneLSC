import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/router';
import Link from 'next/link';
import styles from '../../styles/Admin.module.css';
import BottomNav from '../../components/BottomNav';

export default function NewsManagement() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/news');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to fetch news articles');
      }
      const data = await res.json();
      setArticles(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user || !user.roles.includes('Admin')) {
      router.push('/');
      return;
    }
    fetchArticles();
  }, [user, authLoading, router]);

  const handleDelete = async (articleId) => {
    if (!window.confirm('Are you sure you want to delete this news article?')) return;
    setError(null);
    try {
      const res = await fetch(`/api/news/${articleId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete article');
      }
      fetchArticles(); // Refresh list
    } catch (err) {
      setError(err.message);
    }
  };

  if (authLoading || loading) return <p>Loading...</p>;
  if (!user || !user.roles.includes('Admin')) return <p>Redirecting...</p>;

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1>News Article Management</h1>
      </header>
      <div className={styles.container}>
        <div className={styles.adminNav}>
            <Link href="/admin/users" className={styles.adminNavLink}>Manage Users</Link>
            <span style={{ margin: '0 1rem' }}>|</span>
            <Link href="/admin/groups" className={styles.adminNavLink}>Manage Groups</Link>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.tableContainer}>
          <table className={styles.userTable}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Author</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => (
                <tr key={article.id}>
                  <td>{article.title}</td>
                  <td>{article.authorName}</td>
                  <td>{new Date(article.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button onClick={() => handleDelete(article.id)} className={styles.deleteBtn}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {articles.length === 0 && (
                <tr>
                  <td colSpan="4">No news articles found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
