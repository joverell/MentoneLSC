import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../../context/AuthContext';
import styles from '../../../styles/Admin.module.css';
import BottomNav from '../../../components/BottomNav';

export default function EditUser() {
  const { user: adminUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { id: userId } = router.query;

  const [userData, setUserData] = useState(null);
  const [allGroups, setAllGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (authLoading || !router.isReady) return;
    if (!adminUser || !adminUser.roles.includes('Admin')) {
      router.push('/');
      return;
    }

    const fetchData = async () => {
      if (!userId) return;
      try {
        setLoading(true);
        const [userRes, groupsRes] = await Promise.all([
          fetch(`/api/users/${userId}`),
          fetch('/api/access_groups'),
        ]);

        if (!userRes.ok) {
          const data = await userRes.json();
          throw new Error(data.message || 'Failed to fetch user data');
        }
        const userDetails = await userRes.json();
        setUserData({
          ...userDetails,
          roles: userDetails.roles || [],
          groupIds: userDetails.groupIds || [],
        });

        if (!groupsRes.ok) {
          const data = await groupsRes.json();
          throw new Error(data.message || 'Failed to fetch groups');
        }
        const groupsData = await groupsRes.json();
        setAllGroups(groupsData);

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, adminUser, authLoading, router.isReady]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e) => {
    const { name, value, checked } = e.target;
    setUserData(prev => {
      const currentValues = prev[name] || [];
      if (checked) {
        return { ...prev, [name]: [...currentValues, value] };
      } else {
        return { ...prev, [name]: currentValues.filter(item => item !== value) };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update user');
      }
      setSuccess('User updated successfully!');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        const res = await fetch(`/api/users/${userId}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'Failed to delete user');
        }
        router.push('/admin/users');
      } catch (err) {
        setError(err.message);
      }
    }
  };

  if (loading || authLoading) return <p>Loading...</p>;
  if (!adminUser || !adminUser.roles.includes('Admin')) return <p>Redirecting...</p>;
  if (error) return <p className={styles.error}>{error}</p>;
  if (!userData) return <p>User not found.</p>;

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1>Edit User: {userData.name}</h1>
      </header>
      <div className={styles.container}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={userData.name}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={userData.email}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="patrolQualifications">Patrol Qualifications</label>
            <input type="text" id="patrolQualifications" name="patrolQualifications" placeholder="e.g., Bronze Medallion, IRB Driver" value={userData.patrolQualifications || ''} onChange={handleInputChange} />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="emergencyContact">Emergency Contact</label>
            <input type="text" id="emergencyContact" name="emergencyContact" placeholder="e.g., Jane Doe - 0400 123 456" value={userData.emergencyContact || ''} onChange={handleInputChange} />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="uniformSize">Uniform Size</label>
            <input type="text" id="uniformSize" name="uniformSize" placeholder="e.g., Mens L, Womens 12" value={userData.uniformSize || ''} onChange={handleInputChange} />
          </div>
          <div className={styles.formGroup}>
            <label>Roles</label>
            <div className={styles.checkboxGroup}>
              <label>
                <input
                  type="checkbox"
                  name="roles"
                  value="Admin"
                  checked={userData.roles.includes('Admin')}
                  onChange={handleCheckboxChange}
                />
                Admin (Super Admin)
              </label>
              <label>
                <input
                  type="checkbox"
                  name="roles"
                  value="Group Admin"
                  checked={userData.roles.includes('Group Admin')}
                  onChange={handleCheckboxChange}
                />
                Group Admin
              </label>
            </div>
          </div>
          <div className={styles.formGroup}>
            <label>Member Of Groups</label>
            <div className={styles.checkboxGroup}>
              {allGroups.map(group => (
                <label key={group.id}>
                  <input
                    type="checkbox"
                    name="groupIds"
                    value={group.id}
                    checked={userData.groupIds.includes(group.id)}
                    onChange={handleCheckboxChange}
                  />
                  {group.name}
                </label>
              ))}
            </div>
          </div>
          <div className={styles.formGroup}>
            <label>Admin For Groups</label>
            <p className={styles.fieldDescription}>Select which groups this user can manage events and news for (if they have the 'Group Admin' role).</p>
            <div className={styles.checkboxGroup}>
              {allGroups.map(group => (
                <label key={group.id}>
                  <input
                    type="checkbox"
                    name="adminForGroups"
                    value={group.id}
                    checked={userData.adminForGroups && userData.adminForGroups.includes(group.id)}
                    onChange={handleCheckboxChange}
                  />
                  {group.name}
                </label>
              ))}
            </div>
          </div>
          {error && <p className={styles.error}>{error}</p>}
          {success && <p className={styles.success}>{success}</p>}
          <button type="submit" className={styles.button}>Save Changes</button>
          <button type="button" onClick={handleDelete} className={`${styles.button} ${styles.deleteBtn}`}>Delete User</button>
        </form>
      </div>
      <BottomNav />
    </div>
  );
}
