import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/router';
import styles from '../../../styles/Admin.module.css';
import BottomNav from '../../../components/BottomNav';

export default function ManageUser() {
  const { user: adminUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { id: userId } = router.query;

  const [user, setUser] = useState(null);
  const [allRoles, setAllRoles] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState(new Set());
  const [selectedGroups, setSelectedGroups] = useState(new Set());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (authLoading || !userId) return;

    if (!adminUser || !adminUser.roles.includes('Admin')) {
      router.push('/');
      return;
    }

    const fetchData = async () => {
      try {
        const [userRes, rolesRes, groupsRes] = await Promise.all([
          fetch(`/api/users/${userId}`),
          fetch('/api/roles'),
          fetch('/api/access_groups'),
        ]);

        if (!userRes.ok || !rolesRes.ok || !groupsRes.ok) {
          throw new Error('Failed to fetch required data.');
        }

        const userData = await userRes.json();
        const rolesData = await rolesRes.json();
        const groupsData = await groupsRes.json();

        setUser(userData);
        setAllRoles(rolesData);
        setAllGroups(groupsData);
        setSelectedRoles(new Set(userData.roleIds));
        setSelectedGroups(new Set(userData.groupIds));

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [adminUser, authLoading, userId, router]);

  const handleRoleChange = (roleId) => {
    setSelectedRoles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(roleId)) {
        newSet.delete(roleId);
      } else {
        newSet.add(roleId);
      }
      return newSet;
    });
  };

  const handleGroupChange = (groupId) => {
    setSelectedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const roleIds = Array.from(selectedRoles);
      const groupIds = Array.from(selectedGroups);

      const [roleRes, groupRes] = await Promise.all([
        fetch(`/api/users/${userId}/roles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roleIds }),
        }),
        fetch(`/api/users/${userId}/groups`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ groupIds }),
        }),
      ]);

      if (!roleRes.ok || !groupRes.ok) {
        throw new Error('Failed to update one or more permissions.');
      }

      setSuccess('User permissions updated successfully!');

    } catch (err) {
      setError(err.message);
    }
  };

  if (authLoading || loading) return <p>Loading...</p>;
  if (!adminUser || !adminUser.roles.includes('Admin')) return <p>Redirecting...</p>;
  if (error) return <p className={styles.error}>{error}</p>;

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1>Manage User: {user?.name}</h1>
      </header>
      <div className={styles.container}>
        {success && <p className={styles.success}>{success}</p>}
        <form onSubmit={handleSubmit}>
          <div className={styles.formSection}>
            <h3>Roles</h3>
            {allRoles.map(role => (
              <div key={role.id} className={styles.checkboxWrapper}>
                <input
                  type="checkbox"
                  id={`role-${role.id}`}
                  checked={selectedRoles.has(role.id)}
                  onChange={() => handleRoleChange(role.id)}
                />
                <label htmlFor={`role-${role.id}`}>{role.name}</label>
              </div>
            ))}
          </div>
          <div className={styles.formSection}>
            <h3>Access Groups</h3>
            {allGroups.map(group => (
              <div key={group.id} className={styles.checkboxWrapper}>
                <input
                  type="checkbox"
                  id={`group-${group.id}`}
                  checked={selectedGroups.has(group.id)}
                  onChange={() => handleGroupChange(group.id)}
                />
                <label htmlFor={`group-${group.id}`}>{group.name}</label>
              </div>
            ))}
          </div>
          <button type="submit" className={styles.button}>Save Changes</button>
        </form>
      </div>
      <BottomNav />
    </div>
  );
}
