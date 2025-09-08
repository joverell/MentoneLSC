import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import Link from 'next/link';
import styles from '../styles/Home.module.css'; // Using home styles for consistency
import adminStyles from '../styles/Admin.module.css'; // Using admin styles for table/list

export default function ChatLobby() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (authLoading) return; // Wait for authentication to resolve

    if (!user) {
      // Redirect if not logged in
      router.push('/account');
      return;
    }

    const fetchChats = async () => {
      try {
        const res = await fetch('/api/chats');
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'Failed to fetch chats');
        }
        const data = await res.json();
        setGroups(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, [user, authLoading, router]);

  const filteredGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || loading) {
    return <p>Loading...</p>;
  }

  if (!user) {
    return <p>Redirecting...</p>;
  }

  return (
    <>
      <header className={styles.header}>
        <h1>Chat Groups</h1>
        <Link href="/chat/create">
          <a className={adminStyles.button}>Create Chat</a>
        </Link>
      </header>
      <div className={styles.container}>
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        {error && <p className={adminStyles.error}>{error}</p>}
        <div className={adminStyles.tableContainer}>
          <ul className={adminStyles.userTable}>
            {/* Static link to the General chat */}
            <li className={adminStyles.groupRow}>
              <Link href="/chat/general">
                <a className={adminStyles.manageLink}>General</a>
              </Link>
            </li>

            {/* Divider */}
            {filteredGroups.length > 0 && <hr className={adminStyles.divider} />}

            {filteredGroups.length > 0 ? (
              filteredGroups.map((group) => (
                <li key={group.id} className={adminStyles.groupRow}>
                  <Link href={`/chat/${group.id}`}>
                    <a className={adminStyles.manageLink}>{group.name}</a>
                  </Link>
                </li>
              ))
            ) : (
              <p>No chat groups found.</p>
            )}
          </ul>
        </div>
      </div>
    </>
  );
}

export async function getStaticProps() {
    return {
        props: {
            title: 'Chat',
        },
    };
}
