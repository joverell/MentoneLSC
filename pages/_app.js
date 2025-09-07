import Head from 'next/head';
import { useEffect } from 'react';
import '../styles/globals.css';
import ErrorBoundary from '../components/ErrorBoundary';
import { AuthProvider, useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';
import { useRouter } from 'next/router';
import withAuth from '../components/hoc/withAuth';

const publicPaths = ['/account', '/']; // The login page and landing page are public

const Layout = ({ children }) => {
  const { user } = useAuth();
  const router = useRouter();
  const showBottomNav = user && !router.pathname.startsWith('/admin');

  return (
    <>
      <main className="content-wrapper">{children}</main>
      {showBottomNav && <BottomNav />}
    </>
  );
};

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  // Effect to set up the general chat group on initial load
  useEffect(() => {
    const setupGeneralChat = async () => {
      try {
        const res = await fetch('/api/chat/setup', { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
          console.log(data.message);
        } else {
          console.warn('Could not set up general chat:', data.message);
        }
      } catch (error) {
        console.error('Failed to trigger general chat setup:', error);
      }
    };
    setupGeneralChat();
  }, []); // Empty dependency array ensures this runs only once on mount

  const isPublicPage = publicPaths.includes(router.pathname);
  const AuthedComponent = withAuth(Component);

  return (
    <>
      <Head>
        <link rel="icon" href="https://lh3.googleusercontent.com/a/ACg8ocJ6ORu45K50sJufG0lJGMZ5n6KvqlEyMHN-7euIGvYw3S-ysmg=s288-c-no" />
      </Head>
      <ErrorBoundary>
        <AuthProvider>
          <Layout>
            {isPublicPage ? <Component {...pageProps} /> : <AuthedComponent {...pageProps} />}
          </Layout>
        </AuthProvider>
      </ErrorBoundary>
    </>
  );
}

export default MyApp;
