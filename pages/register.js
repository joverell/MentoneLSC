import { useState } from 'react';
import Head from 'next/head';
import { useAuth } from '../context/AuthContext';
import homeStyles from '../styles/Home.module.css';
import formStyles from '../styles/Form.module.css';
import BottomNav from '../components/BottomNav';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { register, loading } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password) {
      setError('All fields are required.');
      return;
    }

    try {
      await register(name, email, password);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className={homeStyles.pageContainer}>
      <Head>
        <title>Register - Mentone LSC Hub</title>
      </Head>

      <header className={homeStyles.header}>
        <h1>Register for Mentone LSC Hub</h1>
      </header>

      <div className={homeStyles.container}>
        <div className={homeStyles.section}>
          <form onSubmit={handleSubmit} className={formStyles.form}>
            <div className={formStyles.formGroup}>
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
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
              {loading ? 'Registering...' : 'Register'}
            </button>
          </form>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
