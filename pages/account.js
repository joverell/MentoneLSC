import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import homeStyles from '../styles/Home.module.css';
import formStyles from '../styles/Form.module.css'; // For button styles
import BottomNav from '../components/BottomNav';

export default function Account() {
  const { user, isAuthenticated, loading, logout } = useAuth();

  const renderContent = () => {
    if (loading) {
      return <p>Loading...</p>;
    }

    if (isAuthenticated && user) {
      return (
        <div>
          <h2>Welcome, {user.name}!</h2>
          <p>
            <strong>Email:</strong> {user.email}
          </p>
          <button onClick={logout} className={formStyles.button}>
            Logout
          </button>
        </div>
      );
    }

    return (
      <div>
        <h2>Access Denied</h2>
        <p>You must be logged in to view this page.</p>
        <div className={homeStyles.links}>
          <Link href="/login" passHref>
            <a className={formStyles.button}>Login</a>
          </Link>
          <Link href="/register" passHref>
            <a className={formStyles.button}>Register</a>
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div className={homeStyles.pageContainer}>
      <Head>
        <title>Account - Mentone LSC Hub</title>
      </Head>

      <header className={homeStyles.header}>
        <h1>My Account</h1>
      </header>

      <div className={homeStyles.container}>
        <div className={homeStyles.section}>{renderContent()}</div>
      </div>

      <BottomNav />
    </div>
  );
}
