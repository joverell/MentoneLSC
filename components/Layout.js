// components/Layout.js
import Head from 'next/head';
import BottomNav from './BottomNav';
import styles from '../styles/Home.module.css'; // You can reuse or create a new layout style

export default function Layout({ children, title, showHeader = true, showBottomNav = true }) {
  return (
    <div className={styles.pageContainer}>
      <Head>
        <title>{title ? `${title} - Mentone LSC Hub` : 'Mentone LSC Hub'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
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
