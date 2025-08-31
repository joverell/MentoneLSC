import db from '../../../lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';

// This should be in an environment variable in a real application
const JWT_SECRET = 'a-secure-and-long-secret-key-that-is-at-least-32-characters';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find the user by email
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = stmt.get(email);

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Compare the provided password with the stored hash
    const isValid = bcrypt.compareSync(password, user.password);

    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Passwords match, create a JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '1h' } // Token expires in 1 hour
    );

    // Serialize the token into a cookie
    const cookie = serialize('auth_token', token, {
      httpOnly: true, // The cookie is not accessible via client-side script
      secure: process.env.NODE_ENV !== 'development', // Use secure cookies in production
      sameSite: 'strict', // Strictly same-site policy
      maxAge: 60 * 60, // 1 hour in seconds
      path: '/', // The cookie is available for all paths
    });

    // Set the cookie in the response header
    res.setHeader('Set-Cookie', cookie);

    // Respond with success and user info (without the password hash)
    res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'An error occurred during login' });
  }
}
