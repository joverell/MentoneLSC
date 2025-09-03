import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/router';
import styles from '../../../styles/Admin.module.css';
import BottomNav from '../../../components/BottomNav';

export default function ManageUser() {
  const { user: adminUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { id: userId } = router.query;

  const [userData, setUserData] = useState({
    name: '',
    email: '',
    patrolQualifications: '',
    emergencyContact: '',
    uniformSize: ''
  });
  const [allRoles, setAllRoles] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState(new Set());
  const [selectedGroups, setSelectedGroups] = useState(new Set());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [userRes, rolesRes, groupsRes] = await Promise.all([
        fetch(`/api/users/${userId}`),
        fetch('/api/roles'),
        fetch('/api/access_groups'),
      ]);

      if (!userRes.ok || !rolesRes.ok || !groupsRes.ok) {
        throw new Error('Failed to fetch required data.');
      }

      const fetchedUserData = await userRes.json();
      const rolesData = await rolesRes.json();
      const groupsData = await groupsRes.json();

      setUserData({
        name: fetchedUserData.name,
        email: fetchedUserData.email,
        patrolQualifications: fetchedUserData.patrolQualifications || '',
        emergencyContact: fetchedUserData.emergencyContact || '',
        uniformSize: fetchedUserData.uniformSize || '',
      });
      setAllRoles(rolesData);
      setAllGroups(groupsData);
      setSelectedRoles(new Set(fetchedUserData.roleIds));
      setSelectedGroups(new Set(fetchedUserData.groupIds));

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (authLoading) return;
    if (!adminUser || !adminUser.roles.includes('Admin')) {
      router.push('/');
      return;
    }
    fetchData();
  }, [adminUser, authLoading, router, fetchData]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (roleId) => {
    setSelectedRoles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(roleId)) newSet.delete(roleId);
      else newSet.add(roleId);
      return newSet;
    });
  };

  const handleGroupChange = (groupId) => {
    setSelectedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) newSet.delete(groupId);
      else newSet.add(groupId);
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

      const profileUpdateRes = fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const roleUpdateRes = fetch(`/api/users/${userId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleIds }),
      });

      const groupUpdateRes = fetch(`/api/users/${userId}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupIds }),
      });

      const [profileRes, roleRes, groupRes] = await Promise.all([profileUpdateRes, roleUpdateRes, groupUpdateRes]);

      if (!profileRes.ok || !roleRes.ok || !groupRes.ok) {
        throw new Error('Failed to update one or more sections.');
      }

      setSuccess('User updated successfully!');
      // Optionally, refetch data to confirm changes
      fetchData();

    } catch (err) {
      setError(err.message);
    }
  };

  if (authLoading || loading) return <p>Loading...</p>;
  if (!adminUser || !adminUser.roles.includes('Admin')) return <p>Redirecting...</p>;

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1>Manage User: {userData.name}</h1>
      </header>
      <div className={styles.container}>
        {error && <p className={styles.error}>{error}</p>}
        {success && <p className={styles.success}>{success}</p>}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formSection}>
            <h3>Profile Information</h3>
            <label htmlFor="name">Name</label>
            <input type="text" id="name" name="name" value={userData.name} onChange={handleProfileChange} />

            <label htmlFor="email">Email</label>
            <input type="email" id="email" name="email" value={userData.email} onChange={handleProfileChange} />

            <label htmlFor="patrolQualifications">Patrol Qualifications</label>
            <input type="text" id="patrolQualifications" name="patrolQualifications" value={userData.patrolQualifications} onChange={handleProfileChange} />

            <label htmlFor="emergencyContact">Emergency Contact</label>
            <input type="text" id="emergencyContact" name="emergencyContact" value={userData.emergencyContact} onChange={handleProfileChange} />

            <label htmlFor="uniformSize">Uniform Size</label>
            <input type="text" id="uniformSize" name="uniformSize" value={userData.uniformSize} onChange={handleProfileChange} />
          </div>

          <div className={styles.formSection}>
            <h3>Roles</h3>
            {allRoles.map(role => (
              <div key={role.id} className={styles.checkboxWrapper}>
                <input type="checkbox" id={`role-${role.id}`} checked={selectedRoles.has(role.id)} onChange={() => handleRoleChange(role.id)} />
                <label htmlFor={`role-${role.id}`}>{role.name}</label>
              </div>
            ))}
          </div>
          <div className={styles.formSection}>
            <h3>Access Groups</h3>
            {allGroups.map(group => (
              <div key={group.id} className={styles.checkboxWrapper}>
                <input type="checkbox" id={`group-${group.id}`} checked={selectedGroups.has(group.id)} onChange={() => handleGroupChange(group.id)} />
                <label htmlFor={`group-${group.id}`}>{group.name}</label>
              </div>
            ))}
          </div>
          <button type="submit" className={styles.button}>Save All Changes</button>
        </form>
      </div>
      <BottomNav />
    </div>
  );
}
