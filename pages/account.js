import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { storage } from '../src/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import homeStyles from '../styles/Home.module.css';
import formStyles from '../styles/Form.module.css';

export default function Account() {
  const { user, isAuthenticated, loading, logout, login, loginWithGoogle, register, fetchUser } = useAuth();

  // State for view mode
  const [formMode, setFormMode] = useState('login'); // 'login' or 'register'

  // State for the account profile form
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    photoURL: '',
    patrolQualifications: '',
    emergencyContact: '',
    uniformSize: '',
    notificationSettings: { news: true, events: true, chat: true },
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [success, setSuccess] = useState(null);

  // State for the login form
  const [loginEmail, setLoginEmail] = useState('');
  const [password, setPassword] = useState('');

  // State for the register form
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');

  // Shared error state
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      setUserData({
        name: user.name || '',
        email: user.email || '',
        photoURL: user.photoURL || '',
        patrolQualifications: user.patrolQualifications || '',
        emergencyContact: user.emergencyContact || '',
        uniformSize: user.uniformSize || '',
        notificationSettings: user.notificationSettings || { news: true, events: true, chat: true },
      });
    }
  }, [user]);

  useEffect(() => {
    if (isAuthenticated) {
      setFormMode('login');
    }
  }, [isAuthenticated]);

  const handleProfileChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith('notification_')) {
      const key = name.split('_')[1];
      setUserData(prev => ({
        ...prev,
        notificationSettings: { ...prev.notificationSettings, [key]: checked },
      }));
    } else {
      setUserData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handlePhotoChange = (e) => {
    if (e.target.files[0]) {
      setPhotoFile(e.target.files[0]);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!user) {
      setError("You are not logged in.");
      return;
    }

    try {
      const formData = new FormData();

      // Append all user data to the form
      formData.append('name', userData.name);
      formData.append('email', userData.email);
      formData.append('patrolQualifications', userData.patrolQualifications);
      formData.append('emergencyContact', userData.emergencyContact);
      formData.append('uniformSize', userData.uniformSize);
      formData.append('notificationSettings', JSON.stringify(userData.notificationSettings));
      formData.append('photoURL', userData.photoURL); // Send existing URL

      // Append the new photo file if one was selected
      if (photoFile) {
        formData.append('photo', photoFile);
      }

      const res = await fetch(`/api/users/${user.uid}`, {
        method: 'PUT',
        body: formData, // No 'Content-Type' header needed, browser sets it for FormData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update profile.');

      setSuccess('Profile updated successfully!');
      // Refresh user data from context to get the latest profile, including new photo URL
      if (fetchUser) fetchUser();

    } catch (err) {
      setError(err.message);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(loginEmail, password);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!registerName || !registerEmail || !registerPassword) {
      setError('All fields are required.');
      return;
    }
    try {
      await register(registerName, registerEmail, registerPassword);
      // On successful registration, AuthContext will redirect to /account
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
        <div className={homeStyles.section}>
          <form onSubmit={handleProfileSubmit} className={formStyles.form}>
            <h2>Welcome, {userData.name}!</h2>
            {error && <p className={formStyles.error}>{error}</p>}
            {success && <p className={formStyles.success}>{success}</p>}
            <div className={formStyles.formGroup}>
                {userData.photoURL && <img src={userData.photoURL} alt="Profile" style={{ width: '100px', height: '100px', borderRadius: '50%' }} />}
                <label htmlFor="photo">Profile Photo</label>
                <input type="file" id="photo" name="photo" onChange={handlePhotoChange} />
            </div>
            <div className={formStyles.formGroup}>
              <label htmlFor="name">Name</label>
              <input type="text" id="name" name="name" value={userData.name} onChange={handleProfileChange} />
            </div>
            <div className={formStyles.formGroup}>
              <label htmlFor="email">Email</label>
              <input type="email" id="email" name="email" value={userData.email} onChange={handleProfileChange} disabled />
            </div>
            <div className={formStyles.formGroup}>
              <label htmlFor="patrolQualifications">Patrol Qualifications</label>
              <input type="text" id="patrolQualifications" name="patrolQualifications" placeholder="e.g., Bronze Medallion, IRB Driver" value={userData.patrolQualifications} onChange={handleProfileChange} />
            </div>
            <div className={formStyles.formGroup}>
              <label htmlFor="emergencyContact">Emergency Contact</label>
              <input type="text" id="emergencyContact" name="emergencyContact" placeholder="e.g., Jane Doe - 0400 123 456" value={userData.emergencyContact} onChange={handleProfileChange} />
            </div>
            <div className={formStyles.formGroup}>
              <label htmlFor="uniformSize">Uniform Size</label>
              <input type="text" id="uniformSize" name="uniformSize" placeholder="e.g., Mens L, Womens 12" value={userData.uniformSize} onChange={handleProfileChange} />
            </div>
            <div className={formStyles.formGroup}>
              <h3>Notification Settings</h3>
              <ul>
                <li><label><input type="checkbox" name="notification_news" checked={userData.notificationSettings.news} onChange={handleProfileChange} /> Notify me about new News Articles</label></li>
                <li><label><input type="checkbox" name="notification_events" checked={userData.notificationSettings.events} onChange={handleProfileChange} /> Notify me about new Events & Reminders</label></li>
                <li><label><input type="checkbox" name="notification_chat" checked={userData.notificationSettings.chat} onChange={handleProfileChange} /> Notify me about new Chat Messages</label></li>
              </ul>
            </div>
            <button type="submit" className={formStyles.button}>Update Profile</button>
            <button type="button" onClick={logout} className={`${formStyles.button} ${formStyles.buttonSecondary}`}>Logout</button>
          </form>
        </div>
      );
    }

    // Not authenticated, show login or register form
    if (formMode === 'login') {
      return (
        <div className={homeStyles.section}>
          <form onSubmit={handleLoginSubmit} className={formStyles.form}>
            <div className={formStyles.formGroup}>
              <label htmlFor="loginEmail">Email Address</label>
              <input type="email" id="loginEmail" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
            </div>
            <div className={formStyles.formGroup}>
              <label htmlFor="password">Password</label>
              <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p className={formStyles.error}>{error}</p>}
            <button type="submit" disabled={loading} className={formStyles.button}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
            <button type="button" onClick={handleGoogleLogin} disabled={loading} className={`${formStyles.button} ${formStyles.googleButton}`}>
              Sign in with Google
            </button>
          </form>
          <div className={homeStyles.links} style={{ textAlign: 'center', marginTop: '1rem' }}>
            <p>Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); setFormMode('register'); setError(null); }}>Register here</a></p>
          </div>
        </div>
      );
    }

    return ( // formMode === 'register'
      <div className={homeStyles.section}>
        <form onSubmit={handleRegisterSubmit} className={formStyles.form}>
          <div className={formStyles.formGroup}>
            <label htmlFor="registerName">Full Name</label>
            <input type="text" id="registerName" value={registerName} onChange={(e) => setRegisterName(e.target.value)} required />
          </div>
          <div className={formStyles.formGroup}>
            <label htmlFor="registerEmail">Email Address</label>
            <input type="email" id="registerEmail" value={registerEmail} onChange={(e) => setRegisterEmail(e.target.value)} required />
          </div>
          <div className={formStyles.formGroup}>
            <label htmlFor="registerPassword">Password</label>
            <input type="password" id="registerPassword" value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} required />
          </div>
          {error && <p className={formStyles.error}>{error}</p>}
          <button type="submit" disabled={loading} className={formStyles.button}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <div className={homeStyles.links} style={{ textAlign: 'center', marginTop: '1rem' }}>
          <p>Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); setFormMode('login'); setError(null); }}>Login here</a></p>
        </div>
      </div>
    );
  };

  const getPageTitle = () => {
    if (isAuthenticated) return 'My Account';
    if (formMode === 'register') return 'Register';
    return 'Login';
  };

  return (
    <>
      <Head>
        <title>{getPageTitle()} - Mentone LSC Hub</title>
      </Head>
      <header className={homeStyles.header}>
        <h1>{getPageTitle()}</h1>
      </header>
      <div className={homeStyles.container}>
        {renderContent()}
      </div>
    </>
  );
}
