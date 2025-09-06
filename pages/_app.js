import Head from 'next/head';
import '../styles/globals.css';
import { AuthProvider, useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';
import { useRouter } from 'next/router';

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
  return (
    <>
      <Head>
        <link rel="icon" href="https://lh3.googleusercontent.com/a/ACg8ocJ6ORu45K50sJufG0lJGMZ5n6KvqlEyMHN-7euIGvYw3S-ysmg=s288-c-no" />
      </Head>
      <AuthProvider>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </AuthProvider>
    </>
  );
}

export default MyApp;
