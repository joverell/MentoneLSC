import { useState } from 'react';
import Head from 'next/head';
import { useAuth } from '../context/AuthContext';
import homeStyles from '../styles/Home.module.css';
import formStyles from '../styles/Form.module.css';
import BottomNav from '../components/BottomNav';
import axios from 'axios';
import { useRouter } from 'next/router';

export default function LoginTest() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/login-test', { email, password });
      // This is a test page, so we don't need to set the user in the context.
      // We'll just redirect to the account page on success.
      router.push('/account');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={homeStyles.pageContainer}>
      <Head>
        <title>Login Test - Mentone LSC Hub</title>
      </Head>

      <header className={homeStyles.header}>
        <h1>Login Test to Mentone LSC Hub</h1>
      </header>

      <div className={homeStyles.container}>
        <div className={homeStyles.section}>
          <form onSubmit={handleSubmit} className={formStyles.form}>
            <div className={formStyles.formGroup}>
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className={formStyles.formGroup}>
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className={formStyles.error}>{error}</p>}
            <button type="submit" disabled={loading} className={formStyles.button}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
