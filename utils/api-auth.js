import { adminAuth } from '@/src/firebase-admin';

export const withAuth = (handler) => {
    return async (req, res) => {
        const { authorization } = req.headers;

        if (!authorization || !authorization.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Unauthorized: No token provided.' });
        }

        const token = authorization.split('Bearer ')[1];

        try {
            const decodedToken = await adminAuth.verifyIdToken(token);
            req.user = decodedToken; // Add user info to the request object
            return handler(req, res);
        } catch (error) {
            console.error('Firebase token verification error:', error);
            if (error.code === 'auth/id-token-expired') {
                return res.status(401).json({ message: 'Unauthorized: Token expired.' });
            }
            return res.status(401).json({ message: 'Unauthorized: Invalid token.' });
        }
    };
};
