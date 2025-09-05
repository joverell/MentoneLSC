import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import Link from 'next/link';
import styles from '../styles/Home.module.css'; // Using home styles for consistency
import adminStyles from '../styles/Admin.module.css'; // Using admin styles for table/list
import BottomNav from '../components/BottomNav';

export default function ChatLobby() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authLoading) return; // Wait for authentication to resolve

    if (!user) {
      // Redirect if not logged in
      router.push('/account');
      return;
    }

    const fetchGroups = async () => {
      try {
        const res = await fetch('/api/my-groups');
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'Failed to fetch chat groups');
        }
        const data = await res.json();
        setGroups(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return <p>Loading...</p>;
  }

  if (!user) {
    return <p>Redirecting...</p>;
  }

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1>Chat Groups</h1>
      </header>
      <div className={styles.container}>
        {error && <p className={adminStyles.error}>{error}</p>}
        <div className={adminStyles.tableContainer}>
          <ul className={adminStyles.userTable}>
            {groups.length > 0 ? (
              groups.map((group) => (
                <li key={group.id} className={adminStyles.groupRow}>
                  <Link href={`/chat/${group.id}`}>
                    <a className={adminStyles.manageLink}>{group.name}</a>
                  </Link>
                </li>
              ))
            ) : (
              <p>You are not a member of any chat groups.</p>
            )}
          </ul>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
