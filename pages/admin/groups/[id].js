import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../../context/AuthContext';
import styles from '../../../styles/Admin.module.css';
import BottomNav from '../../../components/BottomNav';
import Link from 'next/link';

export default function ManageGroupMembers() {
  const { user: adminUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { id: groupId } = router.query;

  const [group, setGroup] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [userToAdd, setUserToAdd] = useState('');
  const [adminToAdd, setAdminToAdd] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fetchGroupDetails = useCallback(async () => {
    if (!groupId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/access_groups/${groupId}`);
      if (!res.ok) throw new Error('Failed to fetch group details');
      const data = await res.json();
      setGroup(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  const fetchAllUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setAllUsers(data);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!adminUser || !adminUser.roles.includes('Admin')) {
      router.push('/');
      return;
    }
    fetchGroupDetails();
    fetchAllUsers();
  }, [adminUser, authLoading, router, fetchGroupDetails, fetchAllUsers]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!userToAdd) return;
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/access_groups/${groupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userToAdd }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to add member');
      }
      setSuccess('Member added successfully!');
      setUserToAdd('');
      fetchGroupDetails(); // Refresh member list
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this member from the group?')) return;
    setError(null);
    setSuccess(null);
    try {
      // Note: The API expects userId in the body, which is unusual for DELETE, but we'll match it.
      const res = await fetch(`/api/access_groups/${groupId}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to remove member');
      }
      setSuccess('Member removed successfully!');
      fetchGroupDetails(); // Refresh member list
    } catch (err) {
      setError(err.message);
    }
  };

  if (authLoading || loading) return <p>Loading...</p>;
  if (!group) return <p>Group not found.</p>;

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    if (!adminToAdd) return;
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/access_groups/${groupId}/admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: adminToAdd }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to add admin');
      }
      setSuccess('Group admin added successfully!');
      setAdminToAdd('');
      fetchGroupDetails(); // Refresh group details
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveAdmin = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this admin from the group?')) return;
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/access_groups/${groupId}/admins`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to remove admin');
      }
      setSuccess('Group admin removed successfully!');
      fetchGroupDetails(); // Refresh group details
    } catch (err) {
      setError(err.message);
    }
  };

  if (authLoading || loading) return <p>Loading...</p>;
  if (!group) return <p>Group not found.</p>;

  const usersNotInGroup = allUsers.filter(user =>
    !group.members.some(member => member.id === user.id)
  );

  const groupAdmins = allUsers.filter(user => group.admins.includes(user.id));
  const usersNotAdmin = allUsers.filter(user => !group.admins.includes(user.id));

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1>Manage Members for "{group.name}"</h1>
      </header>
      <div className={styles.container}>
        <div className={styles.adminNav}>
            <Link href="/admin/groups" className={styles.adminNavLink}>Back to Groups</Link>
        </div>

        {error && <p className={styles.error}>{error}</p>}
        {success && <p className={styles.success}>{success}</p>}

        {adminUser && adminUser.isSuperAdmin && (
          <div className={styles.formSection}>
            <h3>Manage Group Administrators</h3>
            <form onSubmit={handleAddAdmin} className={styles.inlineForm}>
              <select value={adminToAdd} onChange={(e) => setAdminToAdd(e.target.value)} required>
                <option value="">Select a user to make admin</option>
                {usersNotAdmin.map(user => (
                  <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
                ))}
              </select>
              <button type="submit" className={styles.button}>Add Admin</button>
            </form>
            <table className={styles.userTable} style={{ marginTop: '1rem' }}>
              <thead>
                <tr>
                  <th>Admin Name</th>
                  <th>Email</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groupAdmins.map((admin) => (
                  <tr key={admin.id}>
                    <td>{admin.name}</td>
                    <td>{admin.email}</td>
                    <td className={styles.actionsCell}>
                      <button onClick={() => handleRemoveAdmin(admin.id)} className={styles.deleteBtn}>Remove Admin</button>
                    </td>
                  </tr>
                ))}
                {groupAdmins.length === 0 && (
                  <tr><td colSpan="3">No group-specific admins.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className={styles.formSection}>
          <h3>Add New Member</h3>
          <form onSubmit={handleAddMember} className={styles.inlineForm}>
            <select value={userToAdd} onChange={(e) => setUserToAdd(e.target.value)} required>
              <option value="">Select a user to add</-option>
              {usersNotInGroup.map(user => (
                <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
              ))}
            </select>
            <button type="submit" className={styles.button}>Add Member</button>
          </form>
        </div>

        <div className={styles.tableContainer}>
          <h3>Current Members</h3>
          <table className={styles.userTable}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {group.members && group.members.map((member) => (
                <tr key={member.id}>
                  <td>{member.name}</td>
                  <td>{member.email}</td>
                  <td className={styles.actionsCell}>
                    <button onClick={() => handleRemoveMember(member.id)} className={styles.deleteBtn}>Remove</button>
                  </td>
                </tr>
              ))}
              {group.members && group.members.length === 0 && (
                <tr>
                    <td colSpan="3">No members in this group yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
