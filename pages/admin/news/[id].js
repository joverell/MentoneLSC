import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import NewsForm from '../../../components/news/NewsForm';
import { useAuth } from '../../../context/AuthContext';

export default function EditNewsPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, loading: authLoading } = useAuth();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/account');
      return;
    }

    if (id) {
      const fetchArticle = async () => {
        try {
          const res = await fetch(`/api/news/get-news?id=${id}`);
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message || 'Failed to fetch article');
          }
          const data = await res.json();
          setArticle(data);
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchArticle();
    }
  }, [id, user, authLoading, router]);

  if (loading || authLoading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;
  if (!article) return <p>Article not found.</p>;

  return (
    <AdminLayout>
      <h1>Edit News Article</h1>
      <NewsForm article={article} />
    </AdminLayout>
  );
}
