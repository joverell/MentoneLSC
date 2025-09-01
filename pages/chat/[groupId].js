import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';
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

  const fetchMessages = useCallback(async () => {
    if (!groupId || !user) return;
    try {
      const res = await fetch(`/api/chat/${groupId}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to fetch messages');
      }
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [groupId, user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    fetchMessages();

    // Set up polling for new messages
    const interval = setInterval(fetchMessages, 5000); // Poll every 5 seconds

    return () => clearInterval(interval); // Cleanup on unmount
  }, [authLoading, user, router, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    setError(null);

    try {
      const res = await fetch(`/api/chat/${groupId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to send message');
      }

      setNewMessage('');
      await fetchMessages(); // Refresh messages immediately after sending
    } catch (err) {
      setError(err.message);
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
              msg.userId === user.userId ? styles.myMessage : styles.theirMessage
            }`}
          >
            <div className={styles.messageMeta}>
              {msg.userName} - {new Date(msg.createdAt).toLocaleTimeString()}
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
