import db from '../../../lib/db';
import bcrypt from 'bcryptjs';

export default function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      // Only allow POST requests
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
    }

    const { name, email, password } = req.body;

    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if user already exists
    const stmtCheck = db.prepare('SELECT id FROM users WHERE email = ?');
    const existingUser = stmtCheck.get(email);

    if (existingUser) {
      return res.status(409).json({ message: 'User with this email already exists' });
    }

    // Hash the password
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    // Insert new user into the database
    const stmtInsert = db.prepare(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)'
    );
    const info = stmtInsert.run(name, email, hashedPassword);

    // Respond with success
    return res.status(201).json({ message: 'User created successfully', userId: info.lastInsertRowid });
  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).json({ message: 'An error occurred during registration' });
  }
}
