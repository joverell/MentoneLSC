import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/Form.module.css';
import BottomNav from '../components/BottomNav';

export default function CreateNews() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Protect the route
  if (loading) {
    return <p>Loading...</p>;
  }
  if (!user) {
    if (typeof window !== 'undefined') {
      router.push('/login');
    }
    return null; // Prevent rendering before redirect
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!title || !content) {
      setError('Please fill in both title and content.');
      return;
    }

    try {
      const res = await fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to create article');
      }

      setSuccess('Article created successfully! Redirecting...');
      // Redirect to the new news feed after a short delay
      setTimeout(() => {
        router.push('/?tab=news');
      }, 2000);

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1>Create News Article</h1>
      </header>
      <div className={styles.container}>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <p className={styles.error}>{error}</p>}
          {success && <p className={styles.success}>{success}</p>}

          <div className={styles.formGroup}>
            <label htmlFor="title">Title</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="content">Content</label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows="10"
            />
          </div>

          <button type="submit" className={styles.button}>Publish Article</button>
        </form>
      </div>
      <BottomNav />
    </div>
  );
}
