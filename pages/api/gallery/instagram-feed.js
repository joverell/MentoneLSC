import axios from 'axios';
import { adminDb } from '../../../src/firebase-admin';

const SETTINGS_DOC_ID = 'app-settings';
const INSTAGRAM_USERNAME = 'mentonelifesavingclub';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        // 1. Check if the feature is enabled
        const settingsRef = adminDb.collection('settings').doc(SETTINGS_DOC_ID);
        const doc = await settingsRef.get();
        const settings = doc.data();

        if (!doc.exists || !settings.instagram?.enabled) {
            return res.status(403).json({ message: 'Instagram integration is disabled.' });
        }

        // 2. Fetch data from Instagram's unofficial API
        const url = `https://i.instagram.com/api/v1/users/web_profile_info/?username=${INSTAGRAM_USERNAME}`;
        const headers = {
            // This App ID seems to be public and widely used for this unofficial API.
            "x-ig-app-id": "936619743392459",
            // A generic user-agent can help avoid blocking.
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36",
        };

        const response = await axios.get(url, { headers });
        const userData = response.data.data.user;

        // 3. Extract and format the photo data
        const photos = userData.edge_owner_to_timeline_media.edges.map(edge => {
            const node = edge.node;
            return {
                id: node.id,
                src: node.display_url,
                thumbnail_src: node.thumbnail_src,
                alt: node.edge_media_to_caption.edges[0]?.node.text || `Instagram post by ${INSTAGRAM_USERNAME}`,
                url: `https://www.instagram.com/p/${node.shortcode}/`,
                likes: node.edge_liked_by.count,
                comments: node.edge_media_to_comment.count,
                timestamp: node.taken_at_timestamp
            };
        });

        // 4. Return the formatted data
        return res.status(200).json(photos);

    } catch (error) {
        console.error('Failed to fetch Instagram feed:', error.response ? error.response.data : error.message);
        return res.status(500).json({ message: 'An error occurred while fetching the Instagram feed.' });
    }
}
