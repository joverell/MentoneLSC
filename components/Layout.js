// components/Layout.js
import Head from 'next/head';
import BottomNav from './BottomNav';
import styles from '../styles/Home.module.css';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';

export default function Layout({ children, title, showHeader = true }) {
  const { user } = useAuth();
  const router = useRouter();
  const showBottomNav = router.pathname !== '/account';

  return (
    <div className={styles.container}>
      <Head>
        <title>{title || 'Mentone LSC Hub'}</title>
        <meta name="description" content="Official Mentone LSC Hub" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Conditionally render a header if needed */}
      {showHeader && (
        <header className={styles.header}>
          {/* You can make the header dynamic based on props */}
          <h1>{title || 'Mentone LSC Hub'}</h1>
        </header>
      )}

      <main className={styles.container}>
        {children}
      </main>

      {showBottomNav && <BottomNav />}
    </div>
  );
}
