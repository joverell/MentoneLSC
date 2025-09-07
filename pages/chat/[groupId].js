import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';
import { db } from '../../src/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import styles from '../../styles/Chat.module.css';
import { IoArrowBack, IoSend } from 'react-icons/io5';
import logger from '../../utils/logger';

export default function ChatRoom() {
  const router = useRouter();
  const { groupId } = router.query;
  const { user, loading: authLoading } = useAuth();

  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/account');
      return;
    }
    if (!groupId) {
      setLoading(false);
      return;
    }

    const fetchChatDetails = async () => {
      try {
        const chatDocRef = doc(db, 'chats', groupId);
        const chatDoc = await getDoc(chatDocRef);
        if (chatDoc.exists()) {
          setChat(chatDoc.data());
        } else {
          setError('Chat not found.');
        }
      } catch (err) {
        setError('Failed to load chat details.');
      }
    };

    fetchChatDetails();

    const messagesColRef = collection(db, 'chats', groupId, 'messages');
    const q = query(messagesColRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const msgs = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        msgs.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
        });
      });
      setMessages(msgs);
      setLoading(false);
    }, (err) => {
      logger.error('Firestore listener error in chat room', {
        groupId,
        userId: user ? user.uid : 'unknown',
        errorMessage: err.message,
        errorCode: err.code,
        errorStack: err.stack,
      });
      setError('Could not load messages. You may not have permission to view this chat.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [authLoading, user, groupId, router]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const [replyTo, setReplyTo] = useState(null);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !groupId) return;

    setSending(true);
    setError(null);

    try {
      const messagesColRef = collection(db, 'chats', groupId, 'messages');
      const messageData = {
        message: newMessage.trim(),
        userId: user.uid,
        userName: user.name,
        replyTo: replyTo ? replyTo.id : null,
      };
      await addDoc(messagesColRef, {
        ...messageData,
        createdAt: serverTimestamp(),
      });
      setNewMessage('');
      setReplyTo(null);

      fetch(`/api/chat/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groupId, message: messageData }),
      });
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleReply = (message) => {
    setReplyTo(message);
    setNewMessage(`> ${message.message}\n\n`);
  };

  if (loading) return <p>Loading chat...</p>;
  if (error) return <p className={styles.error}>Error: {error}</p>;

  return (
    <div className={styles.chatPage}>
      <header className={styles.header}>
        <Link href="/chat">
          <a className={styles.backLink}><IoArrowBack /></a>
        </Link>
        <span>{chat?.name || 'Group Chat'}</span>
      </header>

      <div className={styles.messagesContainer}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`${styles.messageBubble} ${
              msg.userId === user.uid ? styles.myMessage : styles.theirMessage
            }`}
          >
            <div className={styles.messageMeta}>
              {msg.userName} - {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString() : 'sending...'}
            </div>
            {msg.message}
            <button onClick={() => handleReply(msg)} className={styles.replyButton}>Reply</button>
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
