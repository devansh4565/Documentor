import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';

const MobileChatView = () => {
  const { sessionId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  // Fetch messages when component mounts
  useEffect(() => {
    if (!sessionId) return;
    const fetchMessages = async () => {
      try {
        setLoading(true);
        const res = await fetch(`http://localhost:5000/api/chats/${sessionId}/messages`);
        const data = await res.json();
        setMessages(data || []);
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, [sessionId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    const userMessageText = newMessage;
    const updatedMessages = [...messages, { text: userMessageText, sender: 'user' }];
    setMessages(updatedMessages);
    setNewMessage('');
    
    // This is a placeholder for your AI logic.
    // For now, it will just echo a "not implemented" message.
    try {
      // You would add your `/api/ask` fetch logic here.
      // const res = await fetch(...)
      console.log("TODO: Implement API call to /api/ask for mobile");
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900 text-black dark:text-white">
      <header className="flex-shrink-0 flex items-center justify-between p-4 border-b dark:border-gray-700 shadow-sm">
        <Link to="/mobile/chats" className="font-semibold text-blue-600 dark:text-blue-400">← All Chats</Link>
        <h1 className="font-bold text-lg">Conversation</h1>
        <Link to={`/mobile/chat/${sessionId}/files`} className="font-semibold text-blue-600 dark:text-blue-400">View Files →</Link>
      </header>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && <p>Loading messages...</p>}
        
        {messages.map((msg, idx) => (
          <div key={idx} className={`p-3 rounded-xl max-w-[85%] w-fit break-words ${msg.sender === 'user' ? 'ml-auto bg-green-200 dark:bg-green-800' : 'bg-gray-200 dark:bg-gray-700'}`}>
            <p>{msg.text}</p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <footer className="p-4 border-t dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex gap-2">
            <input 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
            />
            <button onClick={handleSendMessage} className="px-4 py-2 font-semibold rounded-lg bg-blue-600 text-white">Send</button>
        </div>
      </footer>
    </div>
  );
};

export default MobileChatView;