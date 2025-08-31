import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const JWT_SECRET = 'a-secure-and-long-secret-key-that-is-at-least-32-characters';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Parse cookies from the request headers
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.auth_token;

    if (!token) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Respond with the user data from the token
    res.status(200).json({
      id: decoded.userId,
      name: decoded.name,
      email: decoded.email,
    });

  } catch (error) {
    // This will catch errors from jwt.verify if the token is invalid
    res.status(401).json({ message: 'Invalid token' });
  }
}
