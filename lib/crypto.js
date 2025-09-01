// WARNING: This is not a production-ready implementation.
// In a real-world application, you must use a secure key management system.
// Do not hardcode keys and IVs in the source code. Instead, use environment
// variables or a secret management service.
import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
// IMPORTANT: The key must be 32 bytes for aes-256-cbc
const SECRET_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012';
// IMPORTANT: The IV must be 16 bytes for aes-256-cbc
const IV = process.env.ENCRYPTION_IV || '1234567890123456';

if (process.env.NODE_ENV !== 'test' && (!process.env.ENCRYPTION_KEY || !process.env.ENCRYPTION_IV)) {
  console.warn('WARNING: ENCRYPTION_KEY and ENCRYPTION_IV are not set. Using default, insecure values. Please set these environment variables for production.');
}


export function encrypt(text) {
  if (text === null || typeof text === 'undefined') {
    return text;
  }
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY), Buffer.from(IV));
  let encrypted = cipher.update(String(text), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

export function decrypt(text) {
  if (text === null || typeof text === 'undefined') {
    return text;
  }
  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY), Buffer.from(IV));
    let decrypted = decipher.update(text, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    // In case of a decryption error (e.g., malformed input), we can return null
    // or throw an error. Returning null is often safer to prevent crashes.
    return null;
  }
}
