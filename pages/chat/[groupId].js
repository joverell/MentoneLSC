import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';
import { db } from '../../src/firebase'; // Import Firestore instance
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import styles from '../../styles/Chat.module.css';
import { IoArrowBack, IoSend } from 'react-icons/io5';

export default function ChatRoom() {
  const router = useRouter();
  const { groupId } = router.query;
  const { user, loading: authLoading } = useAuth();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Set up the real-time listener
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (!groupId) {
        setLoading(false);
        return; // Don't run if groupId isn't available yet
    }

    setLoading(true);
    const messagesColRef = collection(db, 'chats', groupId, 'messages');
    const q = query(messagesColRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const msgs = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        msgs.push({
          id: doc.id,
          ...data,
          // Convert Firestore Timestamp to JS Date
          createdAt: data.createdAt?.toDate(),
        });
      });
      setMessages(msgs);
      setLoading(false);
    }, (err) => {
      console.error("Firestore listener error:", err);
      setError("Could not load messages. You may not have permission to view this chat.");
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [authLoading, user, groupId, router]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !groupId) return;

    setSending(true);
    setError(null);

    try {
        // NOTE: We are now writing directly to Firestore from the client
        // This requires appropriate Firestore security rules to be in place
        const messagesColRef = collection(db, 'chats', groupId, 'messages');
        const messageData = {
            message: newMessage.trim(),
            userId: user.id,
            userName: user.name,
        };
        await addDoc(messagesColRef, {
            ...messageData,
            createdAt: serverTimestamp()
        });
        setNewMessage('');

        // Trigger push notification
        fetch(`/api/chat/notify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ groupId, message: messageData })
        });

    } catch (err) {
        console.error("Error sending message:", err);
        setError("Failed to send message.");
    } finally {
        setSending(false);
    }
  };

  if (loading) return <p>Loading chat...</p>;
  if (error) return <p className={styles.error}>Error: {error}</p>;

  return (
    <div className={styles.chatPage}>
      <header className={styles.header}>
        <Link href="/chat">
          <a className={styles.backLink}><IoArrowBack /></a>
        </Link>
        <span>Group Chat</span>
      </header>

      <div className={styles.messagesContainer}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`${styles.messageBubble} ${
              msg.userId === user.id ? styles.myMessage : styles.theirMessage
            }`}
          >
            <div className={styles.messageMeta}>
              {msg.userName} - {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString() : 'sending...'}
            </div>
            {msg.message}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form className={styles.inputArea} onSubmit={handleSendMessage}>
        <input
          type="text"
          className={styles.messageInput}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          disabled={sending}
        />
        <button type="submit" className={styles.sendButton} disabled={!newMessage.trim() || sending}>
          <IoSend />
        </button>
      </form>
    </div>
  );
}
