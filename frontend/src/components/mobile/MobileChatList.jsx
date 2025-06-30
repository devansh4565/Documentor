// in frontend/src/components/mobile/MobileChatList.jsx

import React from 'react';
import { Link } from 'react-router-dom';
// You can create a MobileHeader component for the top bar
// import MobileHeader from './MobileHeader'; 

const MobileChatList = ({ initialSessions, setInitialSessions }) => {
  // Logic to create a new chat would go here, similar to your WorkArea
  const handleNewChat = () => { /* ... */ };

  return (
    <div className="bg-white dark:bg-gray-900 text-black dark:text-white min-h-screen">
      {/* <MobileHeader title="My Chats" /> */}
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">DocuMentor Chats</h1>
        <div className="space-y-3">
          {Object.entries(initialSessions).map(([id, session]) => (
            <Link to={`/mobile/chat/${id}`} key={id} className="block p-4 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-sm">
              <p className="font-semibold">{session.name}</p>
              <p className="text-sm text-gray-500">{new Date(session.createdAt).toLocaleString()}</p>
            </Link>
          ))}
        </div>
        <button onClick={handleNewChat} className="fixed bottom-6 right-6 bg-blue-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg text-3xl">+</button>
      </div>
    </div>
  );
};

export default MobileChatList;