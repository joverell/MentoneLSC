import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import homeStyles from '../styles/Home.module.css';
import formStyles from '../styles/Form.module.css';
import BottomNav from '../components/BottomNav';

export default function Account() {
  const { user, isAuthenticated, loading, logout, fetchUser } = useAuth();
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    patrolQualifications: '',
    emergencyContact: '',
    uniformSize: '',
    notificationSettings: {
      news: true,
      events: true,
      chat: true,
    },
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (user) {
      setUserData({
        name: user.name || '',
        email: user.email || '',
        // The user object from context might not have these details initially.
        // We might need to fetch them.
        patrolQualifications: user.patrolQualifications || '',
        emergencyContact: user.emergencyContact || '',
        uniformSize: user.uniformSize || '',
        notificationSettings: user.notificationSettings || { news: true, events: true, chat: true },
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith('notification_')) {
        const key = name.split('_')[1];
        setUserData(prev => ({
            ...prev,
            notificationSettings: {
                ...prev.notificationSettings,
                [key]: checked,
            }
        }));
    } else {
        setUserData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!user) {
      setError("You are not logged in.");
      return;
    }

    try {
      const res = await fetch(`/api/users/${user.uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update profile.');
      }

      setSuccess('Profile updated successfully!');
      // Refresh user context to get the latest data
      if (fetchUser) {
        fetchUser();
      }

    } catch (err) {
      setError(err.message);
    }
  };

  const renderContent = () => {
    if (loading) {
      return <p>Loading...</p>;
    }

    if (isAuthenticated && user) {
      return (
        <form onSubmit={handleSubmit} className={formStyles.form}>
          <h2>Welcome, {userData.name}!</h2>
          {error && <p className={formStyles.error}>{error}</p>}
          {success && <p className={formStyles.success}>{success}</p>}

          <div className={formStyles.formGroup}>
            <label htmlFor="name">Name</label>
            <input type="text" id="name" name="name" value={userData.name} onChange={handleChange} />
          </div>

          <div className={formStyles.formGroup}>
            <label htmlFor="email">Email</label>
            <input type="email" id="email" name="email" value={userData.email} onChange={handleChange} />
          </div>

          <div className={formStyles.formGroup}>
            <label htmlFor="patrolQualifications">Patrol Qualifications</label>
            <input type="text" id="patrolQualifications" name="patrolQualifications" placeholder="e.g., Bronze Medallion, IRB Driver" value={userData.patrolQualifications} onChange={handleChange} />
          </div>

          <div className={formStyles.formGroup}>
            <label htmlFor="emergencyContact">Emergency Contact</label>
            <input type="text" id="emergencyContact" name="emergencyContact" placeholder="e.g., Jane Doe - 0400 123 456" value={userData.emergencyContact} onChange={handleChange} />
          </div>

          <div className={formStyles.formGroup}>
            <label htmlFor="uniformSize">Uniform Size</label>
            <input type="text" id="uniformSize" name="uniformSize" placeholder="e.g., Mens L, Womens 12" value={userData.uniformSize} onChange={handleChange} />
          </div>

          <div className={formStyles.formGroup}>
            <h3>Notification Settings</h3>
            <ul>
              <li>
                <label>
                  <input type="checkbox" name="notification_news" checked={userData.notificationSettings.news} onChange={handleChange} />
                  Notify me about new News Articles
                </label>
              </li>
              <li>
                <label>
                  <input type="checkbox" name="notification_events" checked={userData.notificationSettings.events} onChange={handleChange} />
                  Notify me about new Events & Reminders
                </label>
              </li>
              <li>
                <label>
                  <input type="checkbox" name="notification_chat" checked={userData.notificationSettings.chat} onChange={handleChange} />
                  Notify me about new Chat Messages
                </label>
              </li>
            </ul>
          </div>

          <button type="submit" className={formStyles.button}>Update Profile</button>
          <button type="button" onClick={logout} className={`${formStyles.button} ${formStyles.buttonSecondary}`}>
            Logout
          </button>
        </form>
      );
    }

    return (
      <div>
        <h2>Access Denied</h2>
        <p>You must be logged in to view this page.</p>
        <div className={homeStyles.links}>
          <Link href="/login" passHref><a className={formStyles.button}>Login</a></Link>
          <Link href="/register" passHref><a className={formStyles.button}>Register</a></Link>
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
