import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { encrypt } from '../../../lib/crypto';

const JWT_SECRET = 'a-secure-and-long-secret-key-that-is-at-least-32-characters';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.auth_token;

    if (!token) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Verify the token and extract the user payload.
    // All the necessary user info is already in the JWT.
    // There is no need to query the database again here.
    const decoded = jwt.verify(token, JWT_SECRET);

    // The payload of the token we created in login.js contains all we need.
    const { userId, name, email, roles, groups } = decoded;

    if (!userId) {
        return res.status(401).json({ message: 'Invalid token payload' });
    }

    res.status(200).json({
      id: encrypt(userId), // Encrypt for consistency
      name: name,
      email: email,
      roles: roles || [],
      groups: groups || [],
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    console.error('Me API Error:', error);
    res.status(500).json({ message: 'An error occurred while fetching user data' });
  }
}
