import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import newsStyles from '../styles/News.module.css';
import BottomNav from '../components/BottomNav';
import NewsForm from '../components/news/NewsForm';

export default function CreateNewsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return <p>Loading...</p>;
  }
  if (!user) {
    if (typeof window !== 'undefined') {
      router.push('/account');
    }
    return null;
  }

  return (
    <div className={newsStyles.createNewsContainer}>
      <header className={newsStyles.header}>
        <h1>Create News Article</h1>
      </header>
      <NewsForm />
      <BottomNav />
    </div>
  );
}
