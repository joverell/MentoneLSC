import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/router';
import Link from 'next/link';
import styles from '../../styles/Admin.module.css';
import AdminLayout from '../../components/admin/AdminLayout';
import Button from '../../components/ui/Button';

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
    <AdminLayout>
      <h1 className={styles.pageTitle}>News Article Management</h1>
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
                  <Button href={`/admin/news/${article.id}`} variant="primary">Edit</Button>
                  <Button onClick={() => handleDelete(article.id)} variant="danger">
                    Delete
                  </Button>
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
    </AdminLayout>
  );
}
