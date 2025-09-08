import Head from 'next/head';
import { useEffect } from 'react';
import '../styles/globals.css';
import ErrorBoundary from '../components/ErrorBoundary';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import withAuth from '../components/hoc/withAuth';
import Layout from '../components/Layout'; // Import the new Layout

const publicPaths = ['/account', '/']; // The login page and landing page are public

// This is a new wrapper component that decides which layout to use.
const AppLayout = ({ children, pageProps }) => {
  const router = useRouter();
  const { user } = useAuth();

  // Conditionally show the BottomNav
  const showBottomNav = !router.pathname.startsWith('/admin');

  // The title can be passed from the page via pageProps
  const pageTitle = pageProps.title;

  return (
    <Layout title={pageTitle} showHeader={!router.pathname.startsWith('/admin')} showBottomNav={showBottomNav}>
      {children}
    </Layout>
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
          <AppLayout pageProps={pageProps}>
            {isPublicPage ? <Component {...pageProps} /> : <AuthedComponent {...pageProps} />}
          </AppLayout>
        </AuthProvider>
      </ErrorBoundary>
    </>
  );
}

export default MyApp;
