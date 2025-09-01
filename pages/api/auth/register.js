import { getDb } from '../../../lib/db';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const db = getDb();

    const stmtCheck = db.prepare('SELECT id FROM users WHERE email = ?');
    const existingUser = stmtCheck.get(email);

    if (existingUser) {
      return res.status(409).json({ message: 'User with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const stmtInsert = db.prepare(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)'
    );
    stmtInsert.run(name, email, hashedPassword);

    return res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).json({ message: 'An error occurred during registration' });
  }
}
