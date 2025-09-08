import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/router';
import styles from '../../styles/Form.module.css';
import axios from 'axios';

export default function CreateChat() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [type, setType] = useState('public');
  const [members, setMembers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/account');
      return;
    }

    const fetchData = async () => {
      try {
        const [usersRes, groupsRes] = await Promise.all([
          axios.get('/api/users'),
          axios.get('/api/access_groups'),
        ]);
        setAllUsers(usersRes.data);
        setAllGroups(groupsRes.data);
      } catch (err) {
        setError('Failed to load users or groups');
      }
    };

    fetchData();
  }, [user, authLoading, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = { name, type };
    if (type === 'private') {
      payload.members = members;
    } else if (type === 'restricted') {
      payload.groups = groups;
    }

    try {
      const res = await axios.post('/api/chats/create', payload);
      router.push(`/chat/${res.data.chatId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create chat');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return <p>Loading...</p>;
  }

  return (
    <>
      <header className={styles.header}>
        <h1>Create Chat</h1>
      </header>
      <form onSubmit={handleSubmit} className={styles.form}>
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.formGroup}>
          <label htmlFor="name">Chat Name</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="type">Chat Type</label>
          <select id="type" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="public">Public</option>
            <option value="private">Private</option>
            <option value="restricted">Restricted</option>
          </select>
        </div>
        {type === 'private' && (
          <div className={styles.formGroup}>
            <label htmlFor="members">Members</label>
            <select
              id="members"
              multiple
              value={members}
              onChange={(e) => setMembers(Array.from(e.target.selectedOptions, (option) => option.value))}>
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {type === 'restricted' && (
          <div className={styles.formGroup}>
            <label htmlFor="groups">Groups</label>
            <select
              id="groups"
              multiple
              value={groups}
              onChange={(e) => setGroups(Array.from(e.target.selectedOptions, (option) => option.value))}>
              {allGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <button type="submit" disabled={submitting} className={styles.button}>
          {submitting ? 'Creating...' : 'Create Chat'}
        </button>
      </form>
    </>
  );
}

export async function getStaticProps() {
    return {
        props: {
            title: 'Create Chat',
        },
    };
}
