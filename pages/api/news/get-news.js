import { adminDb } from '../../../src/firebase-admin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ message: 'Article ID is required' });
  }

  try {
    const articleRef = adminDb.collection('news').doc(id);
    const articleDoc = await articleRef.get();

    if (!articleDoc.exists) {
      return res.status(404).json({ message: 'Article not found' });
    }

    const articleData = articleDoc.data();
    // The 'createdAt' field is a Firestore Timestamp, convert it to a serializable format.
    const article = {
      id: articleDoc.id,
      ...articleData,
      createdAt: articleData.createdAt.toDate().toISOString(),
    };

    res.status(200).json(article);
  } catch (error) {
    console.error(`Error fetching news article ${id}:`, error);
    res.status(500).json({ message: 'An error occurred while fetching the news article.' });
  }
}
