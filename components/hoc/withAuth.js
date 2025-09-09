import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';

const withAuth = (WrappedComponent) => {
  const Wrapper = (props) => {
    const { isAuthenticated, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      console.log('withAuth - loading:', loading, 'isAuthenticated:', isAuthenticated);
      if (!loading && !isAuthenticated) {
        router.push('/account');
      }
    }, [loading, isAuthenticated, router]);

    if (loading) {
      return <p>Loading...</p>;
    }

    if (!isAuthenticated) {
      // Return null or a loader while redirecting
      return null;
    }

    return <WrappedComponent {...props} />;
  };

  return Wrapper;
};

export default withAuth;
