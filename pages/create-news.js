import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import newsStyles from '../styles/News.module.css';
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
    <>
      <header className={newsStyles.header}>
        <h1>Create News Article</h1>
      </header>
      <NewsForm />
    </>
  );
}

export async function getStaticProps() {
    return {
        props: {
            title: 'Create News',
        },
    };
}
