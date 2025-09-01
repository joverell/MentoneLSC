import { getDb } from '../../../lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';

// This should be in an environment variable in a real application
const JWT_SECRET = 'a-secure-and-long-secret-key-that-is-at-least-32-characters';

export default async function handler(req, res) {
  const db = getDb();

  switch (req.method) {
    case 'POST':
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

        // --- Fetch roles and groups ---
        const roleStmt = db.prepare(`
      SELECT
        GROUP_CONCAT(DISTINCT r.name) as roles,
        GROUP_CONCAT(DISTINCT ag.name) as groups
      FROM
        users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      LEFT JOIN user_access_groups uag ON u.id = uag.user_id
      LEFT JOIN access_groups ag ON uag.group_id = ag.id
      WHERE
        u.id = ?
      GROUP BY
        u.id
    `);
        const permissions = roleStmt.get(user.id);
        const roles = permissions && permissions.roles ? permissions.roles.split(',') : [];
        const groups = permissions && permissions.groups ? permissions.groups.split(',') : [];

        // --- Create JWT with permissions ---
        const token = jwt.sign(
          { userId: user.id, email: user.email, name: user.name, roles, groups },
          JWT_SECRET,
          { expiresIn: '1h' }
        );

        const cookie = serialize('auth_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV !== 'development',
          sameSite: 'strict',
          maxAge: 60 * 60,
          path: '/',
        });

        res.setHeader('Set-Cookie', cookie);

        // --- Respond with user info, including permissions ---
        res.status(200).json({
          id: user.id,
          name: user.name,
          email: user.email,
          roles,
          groups,
        });

      } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'An error occurred during login' });
      }
      break;

    default:
      res.setHeader('Allow', ['POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
      break;
  }
}
