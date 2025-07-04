import React, { useState, useEffect, useRef, memo, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useLocation, useNavigate } from "react-router-dom";
import { Sun, Moon, ChevronLeft, ChevronRight, Menu, X, Lightbulb } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { Document, Page, pdfjs } from 'react-pdf';
import axios from "axios";
import { motion, AnimatePresence } from 'framer-motion';
import Header from './Header';
import { auth } from '../firebase';  // Import Firebase auth

// CSS Imports for react-pdf are essential for rendering
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// PDF.js worker configuration
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;


// --- Main Component ---
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "firebase/auth";

import useFirebaseUser from "../hooks/useFirebaseUser"; // adjust path as needed

const WorkArea = ({ user, initialSessions, setInitialSessions }) => {
  // --- State Management ---
  const API = process.env.REACT_APP_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'https://documentor-backend-btiq.onrender.com'; // Ensure this is set correctly

  // Replace all import.meta.env.VITE_API_BASE_URL with API variable in this file
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // Firebase Auth State from custom hook
  const { user: firebaseUser, authReady, getIdToken } = useFirebaseUser();

  // Sidebar Visibility
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [mobileDrawer, setMobileDrawer] = useState(null); // 'left', 'right', or null

  // Popups and Modals
  const [showNewChatPopup, setShowNewChatPopup] = useState(false);
  const [newChatName, setNewChatName] = useState("");
  const [contextMenu, setContextMenu] = useState(null);

  // Session and File Data
  const [selectedChat, setSelectedChat] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [sessionFiles, setSessionFiles] = useState([]);

  // Chat & AI
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [botTyping, setBotTyping] = useState("");

  // PDF Viewer
  const pdfWrapperRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [highlightedPhrases, setHighlightedPhrases] = useState([]);

  // Uploading
  const [isUploading, setIsUploading] = useState(false);
  // At the top of WorkArea, with your other useState hooks
  const [selectedFilesForSummary, setSelectedFilesForSummary] = useState([]);

  // --- Refs and Hooks Setup ---
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const messagesEndRef = useRef(null);

  const contextMenuRef = useRef(null);

  // Temporary debug login button handler
  const handleFirebaseLogin = async () => {
    const auth = getAuth();
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      console.log("✅ Firebase login success:", result.user);
    } catch (error) {
      console.error("❌ Firebase login error:", error);
    }
  };

  // --- Add this new useEffect hook to your WorkArea.jsx component ---

  const hasAutoSelected = useRef(false); // Add this with your other useRef hooks

  // Temporary debug login button JSX
  const loginButton = (
    <button
      onClick={handleFirebaseLogin}
      className="fixed top-4 left-4 z-50 px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700"
    >
      🔥 Login with Google (Firebase)
    </button>
  );

  useEffect(() => {
    if (!authReady || !firebaseUser) return;

    const sessionIds = Object.keys(initialSessions || {});
    
    // This effect runs only once when the sessions are first loaded.
    if (sessionIds.length > 0 && !hasAutoSelected.current) {
        // Assuming the first session in the list is the most recent one.
        const mostRecentSessionId = sessionIds[0];
        console.log(`🚀 Auto-selecting first chat session: ${mostRecentSessionId}`);
        setSelectedChat(mostRecentSessionId);
        
        // Set a flag to prevent this from running again if the user manually deselects a chat.
        hasAutoSelected.current = true;
    }
  }, [initialSessions, authReady, firebaseUser]); // This dependency array ensures it runs when `initialSessions` data arrives and auth is ready.
    // --- Effects ---

  // Effect for responsive PDF width
  useEffect(() => {
    const handleResize = () => {
      if (pdfWrapperRef.current) {
        setContainerWidth(pdfWrapperRef.current.clientWidth);
      }
    };
    // Initial call
    handleResize();
    // Add event listener
    window.addEventListener('resize', handleResize);
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Runs once

  // Re-measure when the selected file changes, ensuring the ref is ready
  useEffect(() => {
    if (selectedFile && pdfWrapperRef.current) {
      setContainerWidth(pdfWrapperRef.current.clientWidth);
    }
  }, [selectedFile]);

  // Effect to handle initial state from navigation (from UploadSection)
  useEffect(() => {
      // Only proceed if there is state and it has an initialFile with an _id
      if (location.state?.initialFile?._id) {
        const file = location.state.initialFile;
        
        // IMPORTANT:
        // Set the session ID from the file object
        setSelectedChat(file.sessionId);
        // Set the file object itself
        setSelectedFile(file);
        
        // Set the files for the session list to include the new one immediately
        setSessionFiles(prev => {
          // Avoid adding duplicates if the effect runs multiple times
          if (prev.some(f => f._id === file._id)) {
              return prev;
          }
          return [...prev, file];
        });

        // Clean up the location state so this doesn't re-run on a simple refresh
        window.history.replaceState({}, document.title);
      }
    }, [location.state]);

  // Effect to adjust sidebars based on screen size
  useEffect(() => {
    if (!isDesktop) {
        setLeftOpen(false);
        setRightOpen(false);
    } else {
        setLeftOpen(true);
        setRightOpen(true);
        setMobileDrawer(null); // Close any mobile drawers
    }
  }, [isDesktop]);
useEffect(() => {
  // We get the auth instance from the Firebase SDK
  const auth = getAuth();
  
  // onAuthStateChanged returns an `unsubscribe` function.
  // We'll call this when the component unmounts to prevent memory leaks.
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    
    if (user) {
      // --- USER IS SIGNED IN ---
      console.log("✅ Auth state changed: User is signed in.", user.email);

      // Define an async function to fetch the user's data
      const fetchUserSessions = async () => {
        try {
          // Get the Firebase ID token from the user object.
          // This is the most reliable way to get the token.
          const token = await user.getIdToken();
          
          console.log("Attempting to fetch sessions with a valid token...");
          
          const response = await fetch(`${API}/api/chats`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          // Check if the network response was successful
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Server responded with status: ${response.status}`);
          }

          const sessionsArray = await response.json();
          console.log("✅ Successfully fetched sessions:", sessionsArray);

          // Convert the array of sessions into an object for easier lookup
          const sessionsObject = {};
          if (Array.isArray(sessionsArray)) {
            sessionsArray.forEach((session) => {
              sessionsObject[session._id] = session;
            });
          }
          
          // Update the state with the fetched sessions
          setInitialSessions(sessionsObject);

        } catch (error) {
          console.error("❌ Failed to fetch initial sessions:", error);
          // In case of an error, clear out any old session data
          setInitialSessions({}); 
        }
      };

      // Call the function to fetch the data
      fetchUserSessions();

    } else {
      // --- USER IS SIGNED OUT ---
      console.log("🚫 Auth state changed: User is signed out.");
      
      // Clear all user-specific state when they log out
      setInitialSessions({});
      setSelectedChat(null);
      setSessionFiles([]);
      setMessages([]);
    }
  });

  // --- CLEANUP FUNCTION ---
  // This function is returned by useEffect and will be called when the
  // WorkArea component is unmounted from the screen.
  return () => {
    console.log("Cleaning up auth state listener.");
    unsubscribe(); // This stops listening to auth changes, preventing memory leaks.
  };

}, [API, setInitialSessions]); // Dependencies for the useEffect

  // Effect to fetch all necessary data when a chat session is selected
  useEffect(() => {
    const fetchSessionDataWithAuth = async () => {
      if (!selectedChat || selectedChat.length !== 24 || !authReady || !firebaseUser) {
        setSessionFiles([]);
        setMessages([]);
        setHighlightedPhrases([]);
        setSelectedFile(null);
        return;
      }
      try {
        setLoading(true);
        const token = await getIdToken();
        const headers = { Authorization: `Bearer ${token}` };

        const [filesRes, messagesRes, highlightsRes] = await Promise.all([
          fetch(`${API}/api/files/${selectedChat}`, { headers }),
          fetch(`${API}/api/chats/${selectedChat}/messages`, { headers }),
          fetch(`${API}/api/highlights/${selectedChat}`, { headers }),
        ]);

        const filesData = await filesRes.json();
        setSessionFiles(filesData.files || []);

        const messagesData = await messagesRes.json();
        const formattedMessages = (messagesData || []).map(dbMsg => ({
          sender: dbMsg.role,
          text: dbMsg.content,
          _id: dbMsg._id
        }));
        setMessages(formattedMessages);

        const highlightsData = await highlightsRes.json();
        setHighlightedPhrases(highlightsData.highlights || []);
      } catch (err) {
        console.error("Failed to fetch session data with auth:", err);
        setSessionFiles([]);
        setMessages([]);
        setHighlightedPhrases([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSessionDataWithAuth();
  }, [selectedChat, authReady, firebaseUser, getIdToken]);

  // Effect to scroll to the bottom of the chat window on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, botTyping]);

  // Effect to close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
        setContextMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []); // Runs once on mount

    // --- Core Functions ---
const createChat = async () => {
  if (!firebaseUser) {
    console.error("🚫 No Firebase user signed in.");
    alert("You must be logged in to create a chat.");
    return;
  }
  if (!newChatName.trim()) {
    alert("Please enter a name for the new chat.");
    return;
  }
  try {
    const token = await getIdToken();
    const res = await fetch(`${API}/api/chats`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: newChatName }),
    });
    if (!res.ok) throw new Error("Failed to create chat session.");
    const newSessionFromDB = await res.json();
    setInitialSessions((prev) => ({
      [newSessionFromDB._id]: newSessionFromDB,
      ...prev,
    }));
    setSelectedChat(newSessionFromDB._id);
    setShowNewChatPopup(false);
    setNewChatName("");
  } catch (err) {
    console.error("Failed to create chat:", err);
    alert("Error: Could not create a new chat session.");
  }
};
  
const renameChat = useCallback(async (sessionId) => {
    // Guard clause: Ensure we are ready to make an authenticated request
    if (!firebaseUser || !authReady || typeof getIdToken !== 'function') {
        console.error("Cannot rename chat: User not authenticated.");
        return;
    }
    
    const currentName = initialSessions[sessionId]?.name || "";
    const newName = prompt("Enter new chat name:", currentName);
    
    if (!newName?.trim() || newName === currentName) {
        setContextMenu(null);
        return;
    }

    try {
        const token = await getIdToken();
        await axios.put(
            `${API}/api/chats/${sessionId}`,
            { name: newName },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        setInitialSessions(prev => ({
            ...prev,
            [sessionId]: { ...prev[sessionId], name: newName }
        }));
    } catch (err) { 
        console.error("Failed to rename chat:", err); 
        alert("Failed to rename chat.");
    } finally {
        setContextMenu(null);
    }
}, [API, initialSessions, firebaseUser, authReady, getIdToken]); // ✅ All dependencies are listed
    
const deleteChat = useCallback(async (sessionId) => {
    // Guard clause
    if (!firebaseUser || !authReady || typeof getIdToken !== 'function') {
        console.error("Cannot delete chat: User not authenticated.");
        return;
    }

    if (!window.confirm("Are you sure you want to delete this chat session?")) {
        setContextMenu(null);
        return;
    }
    
    try {
        const token = await getIdToken();
        await axios.delete(`${API}/api/chats/${sessionId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        // Optimistically update UI
        setInitialSessions(prev => {
            const updated = { ...prev };
            delete updated[sessionId];
            return updated;
        });

        if (selectedChat === sessionId) {
            setSelectedChat(null); // Deselect if the current chat was deleted
        }

    } catch (err) { 
        console.error("Failed to delete chat:", err); 
        alert("Failed to delete chat.");
    } finally {
        setContextMenu(null);
    }
}, [API, selectedChat, firebaseUser, authReady, getIdToken]); // ✅ All dependencies are listed
  
    const onDrop = useCallback(async (acceptedFiles) => {
      if (!selectedChat) {
        alert("Please select or create a chat session first before uploading files.");
        return;
      }
      if (acceptedFiles.length === 0) return;
      const file = acceptedFiles[0];
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sessionId", selectedChat);
      try {
        const token = await getIdToken();
        const res = await fetch(`${API}/api/ocr`, {
          method: "POST",
          body: formData,
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("File upload failed on the server.");
        const newFileFromDB = await res.json();
        setSessionFiles(prevFiles => [...prevFiles, newFileFromDB]);
        setSelectedFile(newFileFromDB);
      } catch (err) {
        console.error("onDrop handler failed:", err);
        alert(`Upload Error: ${err.message}`);
      } finally {
        setIsUploading(false);
      }
    }, [selectedChat, API, getIdToken]);
  
const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;
    const userMessageText = newMessage;
    const userMessageForState = { sender: 'user', text: userMessageText };
    const historyForAPI = [...messages, userMessageForState]
        .slice(-8)
        .map(msg => ({ role: (msg.sender === 'user' ? 'user' : 'assistant'), content: msg.text }));
    
    setMessages(prev => [...prev, userMessageForState]);
    setNewMessage("");
    setLoading(true);
    setBotTyping("");

    try {
        const token = await getIdToken();
        const authHeader = { headers: { Authorization: `Bearer ${token}` } };
        
        await axios.post(`${API}/api/chats/${selectedChat}/messages`, { role: "user", content: userMessageText }, authHeader);

        const res = await axios.post(`${API}/api/ask`, {
            history: historyForAPI,
            fileContent: selectedFile?.content || "",
        }, authHeader);
        const botResponseText = res.data.response || "Sorry, I couldn't get a response.";

        await axios.post(`${API}/api/chats/${selectedChat}/messages`, { role: "assistant", content: botResponseText }, authHeader);
        
        setLoading(false);
        let i = 0;
        const typingInterval = setInterval(() => {
            if (i < botResponseText.length) {
                setBotTyping(botResponseText.slice(0, i + 1));
                i++;
            } else {
                clearInterval(typingInterval);
                setMessages(prev => [...prev, { sender: 'assistant', text: botResponseText }]);
                setBotTyping("");
            }
        }, 25);
    } catch (err) {
        console.error("Error in handleSendMessage:", err);
        setMessages(prev => [...prev, { text: `⚠️ Error: ${err.message}`, sender: 'assistant' }]);
        setLoading(false);
        setBotTyping("");
    }
};

  const handleMultiFileSummarize = async () => {
      if (selectedFilesForSummary.length === 0) return;
      setLoading(true);
      const fileNames = selectedFilesForSummary.map(f => f.name).join(', ');
      const userPromptMsg = { text: `Summarizing ${selectedFilesForSummary.length} file(s): ${fileNames}`, sender: "user" };
      setMessages(prev => [...prev, userPromptMsg]);

      try {
          const token = await getIdToken();
          const authHeader = { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } };

          const textsToSummarize = selectedFilesForSummary.map(file => file.content || "").filter(Boolean);
          const combinedText = textsToSummarize.join("\n\n--- END OF DOCUMENT ---\n\n");
          
          const res = await fetch(`${API}/api/ask`, {
              method: "POST",
              headers: authHeader.headers,
              body: JSON.stringify({
                  history: [{ role: 'user', content: 'Please provide a concise summary of the key points from all the provided document texts.' }],
                  fileContent: combinedText,
              }),
          });
          if (!res.ok) throw new Error("Failed to get summary from the AI.");

          const data = await res.json();
          const summaryText = data.response || "Could not generate a summary.";
          const summaryMsg = { text: summaryText, sender: "bot" };
          setMessages(prev => [...prev, summaryMsg]);
          
          await axios.post(`${API}/api/chats/${selectedChat}/messages`, {
              role: 'assistant',
              content: `Summary of ${fileNames}:\n\n${summaryText}`
          }, authHeader);
      } catch (err) {
          console.error("Multi-file summary failed:", err);
          const errorMsg = { text: `⚠️ Error summarizing files: ${err.message}`, sender: "bot" };
          setMessages(prev => [...prev, errorMsg]);
      } finally {
          setLoading(false);
          setSelectedFilesForSummary([]);
      }
  };

  const handleGenerateMindMap = async () => {
      if (!selectedFile?.content || !selectedChat) {
          alert("Please select a file and a chat session to generate a mind map.");
          return;
      }
      setLoading(true);
      try {
          const token = await getIdToken();
          const authHeader = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
          const res = await fetch(`${API}/api/generate-mindmap`, {
              method: "POST",
              headers: authHeader,
              body: JSON.stringify({ documentText: selectedFile.content }),
          });
          if (!res.ok) throw new Error("AI failed to generate a valid mind map structure.");
          const mindMapData = await res.json();

          await fetch(`${API}/api/mindmap/${selectedChat}`, {
              method: 'POST',
              headers: authHeader,
              body: JSON.stringify({ data: mindMapData }),
          });
          navigate('/mindmap', { state: { sessionId: selectedChat } });
      } catch (err) {
          console.error("Error in mind map generation flow:", err);
          alert(`Error: ${err.message}`);
      } finally {
          setLoading(false);
      }
  };

    const exportChat = () => { 
      if(messages.length === 0) return;
      const content = messages.map(msg => `[${msg.sender.toUpperCase()}] ${new Date().toISOString()}:\n${msg.text}`).join("\n\n");
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chat_export_${selectedChat}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    };
  
  // PDF Navigation
  const onDocumentLoadSuccess = ({ numPages: nextNumPages }) => setNumPages(nextNumPages);
  const goToPrevPage = () => setPageNumber(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages));
  const handleRightClick = (e, sessionId) => {
    e.preventDefault();
    setContextMenu({ x: e.pageX, y: e.pageY, sessionId });
  };

  // --- RENDER ---
  const isDark = theme === "dark";
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] }
  });

  const LeftPanelContent = () => (
    <>
      <div className="flex-1 min-h-0 p-4 flex flex-col gap-6">
          {/* File List Section */}
          <div>
            <h2 className="text-xl font-bold text-center mb-4">File List</h2>
            <div {...getRootProps()} className={`p-4 text-center border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDark ? 'border-gray-600' : 'border-gray-300'} ${isDragActive ? 'bg-blue-500/10' : 'hover:bg-gray-500/10'}`}>
              <input {...getInputProps()} />
              <p className="text-sm font-medium">{isUploading ? "Uploading..." : (isDragActive ? "Drop files here..." : "Drag & drop or click")}</p>
            </div>
            <div className="space-y-2 mt-4 max-h-48 overflow-y-auto pr-2">
              {sessionFiles.map((file) => {
                const isSelectedForSummary = selectedFilesForSummary.some(f => f._id === file._id);
                const toggleSelectForSummary = () => setSelectedFilesForSummary(p => isSelectedForSummary ? p.filter(f => f._id !== file._id) : [...p, file]);
                return (
                  <div key={file._id} className={`p-2 rounded-lg flex items-center justify-between transition-colors ${selectedFile?._id === file._id ? 'bg-blue-200 dark:bg-purple-800' : 'bg-gray-100 dark:bg-gray-700'}`}>
                    <div className="flex-1 min-w-0 pr-2 cursor-pointer" onClick={() => { setSelectedFile(file); if(!isDesktop) setMobileDrawer(null); }}>
                      <p className="font-medium text-sm truncate">{file.name}</p>
                    </div>
                    <input type="checkbox" checked={isSelectedForSummary} onChange={toggleSelectForSummary} onClick={e => e.stopPropagation()} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Previous Chats Section */}
          <div className="flex-1 flex flex-col min-h-0">
            <h2 className="text-xl font-bold text-center mb-4">Previous Chats</h2>
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-2">
              {Object.values(initialSessions || {})
                .filter(session => session?.name && session?.createdAt)
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .map((session) => (
                  <div
                    key={session._id}
                    onClick={() => { setSelectedChat(session._id); if (!isDesktop) setMobileDrawer(null); }}
                    className={`p-2 rounded-lg cursor-pointer transition-colors ${selectedChat === session._id ? "bg-blue-200 dark:bg-purple-800" : "bg-gray-100 dark:bg-gray-700"}`}
                    onContextMenu={(e) => handleRightClick(e, session._id)}
                  >
                    <p className="text-sm font-medium truncate">{session.name}</p>
                    <p className="text-xs text-gray-500">{new Date(session.createdAt).toLocaleString()}</p>
                  </div>
                ))}
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 p-4 border-t dark:border-gray-700">
          <button onClick={() => setShowNewChatPopup(true)} className={`w-full py-2.5 font-semibold rounded-lg text-white shadow-md transition-all ${isDark ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}>+ New Chat</button>
        </div>
    </>
  );

  const RightPanelContent = () => (
    <>
        <div className="flex-shrink-0 p-4 border-b dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-bold">Chat</h2>
            <button onClick={exportChat} className="text-sm px-3 py-1.5 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600">
              Export
            </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, idx) => (
              <div key={msg._id || idx} className={`p-3 rounded-xl max-w-[85%] break-words ${msg.sender === 'user' ? 'ml-auto bg-green-200 dark:bg-green-800' : 'bg-gray-200 dark:bg-gray-700'}`}>
                <p className="text-sm">{msg.text}</p>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 p-3">
                <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce"></div>
              </div>
            )}
            {botTyping && (
              <div className="p-3 rounded-xl w-fit max-w-[85%] bg-gray-200 dark:bg-gray-700">
                <p className="text-sm font-mono whitespace-pre-wrap break-words">{botTyping}<span className="animate-pulse">▍</span></p>
              </div>
            )}
            <div ref={messagesEndRef} />
        </div>
        <div className="flex-shrink-0 p-4 border-t dark:border-gray-700">
            <div className="flex gap-2">
              <input 
                id="chat-message-input"
                name="chat-message-input"
                value={newMessage} 
                onChange={(e) => setNewMessage(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())} 
                placeholder="Type a message..." 
                className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
              />
              <button onClick={handleSendMessage} disabled={loading} className={`px-4 font-semibold rounded-lg text-white ${isDark ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'} disabled:bg-gray-400`}>
                Send
              </button>
            </div>
        </div>
    </>
  );

return (
  <>
    {loginButton}
    <div className={`h-screen w-full flex overflow-hidden ${isDark ? 'bg-gray-900 text-gray-100' : 'bg-blue-50 text-gray-900'} transition-colors duration-300`}>
      {/* Backdrop for mobile drawers */}
      {mobileDrawer && <div onClick={() => setMobileDrawer(null)} className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"></div>}

      {/* --- Desktop Left Sidebar --- */}
      <aside className={`w-80 flex-col flex-shrink-0 hidden lg:flex ${isDark ? 'bg-gray-800' : 'bg-white'} transition-all duration-300 ${leftOpen ? 'ml-0' : '-ml-80'}`}>
        <LeftPanelContent />
      </aside>

      {/* --- Mobile Left Drawer --- */}
      <aside className={`fixed top-0 left-0 w-80 h-full z-40 flex flex-col shadow-xl lg:hidden ${isDark ? 'bg-gray-800' : 'bg-white'} transition-transform duration-300 ${mobileDrawer === 'left' ? 'translate-x-0' : '-translate-x-full'}`}>
        <LeftPanelContent />
      </aside>
      
      {/* --- Main Content Area --- */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Header user={user} />
        <div className="flex-1 flex flex-col h-full">
          {selectedFile ? (
            <div className="flex flex-col h-full p-4">
              <h1 className="flex-shrink-0 text-center font-semibold mb-2 text-lg">{selectedFile.name}</h1>
              <div ref={pdfWrapperRef} className="flex-1 w-full min-h-0 overflow-y-auto flex justify-center py-2 bg-gray-200/30 dark:bg-black/20 rounded-lg">
                {containerWidth > 0 && selectedFile?.url && (
                  <Document
                    file={`${API}${selectedFile.url}`}
                    onLoadSuccess={onDocumentLoadSuccess}
                    key={selectedFile._id}
                    className="w-full h-full flex justify-center"
                  >
                    <Page pageNumber={pageNumber} width={Math.min(containerWidth - 40, 800)} />
                  </Document>
                )}
              </div>
              {numPages && (
                <div className="flex-shrink-0 mt-2 flex justify-center">
                  <div className="flex items-center p-1 bg-gray-200 dark:bg-gray-700 rounded-full shadow-md">
                    <button onClick={goToPrevPage} disabled={pageNumber <= 1} className="px-4 py-1 text-sm font-semibold rounded-full disabled:opacity-50 hover:bg-gray-300 dark:hover:bg-gray-600">Prev</button>
                    <span className="px-4 font-semibold text-sm">Page {pageNumber} of {numPages}</span>
                    <button onClick={goToNextPage} disabled={pageNumber >= numPages} className="px-4 py-1 text-sm font-semibold rounded-full disabled:opacity-50 hover:bg-gray-300 dark:hover:bg-gray-600">Next</button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center p-4 text-center">
              <div className="max-w-md">
                <Lightbulb className="mx-auto h-12 w-12 text-gray-400" />
                <h2 className="mt-2 text-xl font-semibold text-gray-400">Select a file or chat to get started</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Upload a PDF in the left panel, choose a document, and start interacting with your personal AI assistant.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* --- Desktop Right Sidebar --- */}
      <aside className={`w-80 flex-col flex-shrink-0 hidden lg:flex ${isDark ? 'bg-gray-800' : 'bg-white'} transition-all duration-300 ${rightOpen ? 'mr-0' : '-mr-80'}`}>
        <RightPanelContent />
      </aside>

      {/* --- Mobile Right Drawer --- */}
      <aside className={`fixed top-0 right-0 w-80 h-full z-40 flex flex-col shadow-xl lg:hidden ${isDark ? 'bg-gray-800' : 'bg-white'} transition-transform duration-300 ${mobileDrawer === 'right' ? 'translate-x-0' : 'translate-x-full'}`}>
        <RightPanelContent />
      </aside>
      
      {/* --- ABSOLUTE / FLOATING UI ELEMENTS --- */}

      <AnimatePresence>
        {showNewChatPopup && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center" onClick={() => setShowNewChatPopup(false)}>
            <motion.div initial={{ scale: 0.9, y: -20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: -20, opacity: 0 }} className={`p-6 rounded-xl shadow-2xl w-full max-w-md ${isDark ? 'bg-gray-800' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
              <h2 className="text-2xl font-bold mb-4">Create New Chat</h2>
              <input type="text" value={newChatName} onChange={(e) => setNewChatName(e.target.value)} placeholder="Enter chat name..." className={`w-full p-2 border rounded-lg mb-4 ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'}`} onKeyDown={(e) => e.key === 'Enter' && createChat()} />
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowNewChatPopup(false)} className={`px-4 py-2 rounded-lg font-semibold transition-colors ${isDark ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-200 hover:bg-gray-300'}`}>Cancel</button>
                <button onClick={createChat} className={`px-4 py-2 rounded-lg font-semibold text-white transition-colors ${isDark ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}>Create</button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {contextMenu && (
          <div ref={contextMenuRef} style={{ top: contextMenu.y, left: contextMenu.x }} className={`absolute z-50 w-48 rounded-md shadow-lg ${isDark ? 'bg-gray-700' : 'bg-white'} ring-1 ring-black ring-opacity-5`}>
            <div className="py-1" role="menu" aria-orientation="vertical">
              <button onClick={() => renameChat(contextMenu.sessionId)} className="w-full text-left block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600">Rename</button>
              <button onClick={() => deleteChat(contextMenu.sessionId)} className="w-full text-left block px-4 py-2 text-sm text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">Delete</button>
            </div>
          </div>
        )}
      </AnimatePresence>

      <div className="absolute top-4 right-4 z-20 flex items-center gap-4">
        <button onClick={toggleTheme} className={`p-2 rounded-full shadow transition-all duration-300 ${theme === 'light' ? 'bg-blue-200 hover:bg-blue-300 text-blue-800' : 'bg-purple-700 hover:bg-purple-600 text-yellow-300'}`}>
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
        <div className="lg:hidden flex gap-2">
            <button onClick={() => setMobileDrawer('left')} className="p-2 bg-black/10 rounded-full"><Menu size={22}/></button>
            <button onClick={() => setMobileDrawer('right')} className="p-2 bg-black/10 rounded-full"><Menu size={22}/></button>
        </div>
      </div>

      <div className={`absolute bottom-6 z-20 flex flex-col items-end gap-3 transition-all duration-300 ${rightOpen && isDesktop ? 'right-[22rem]' : 'right-6'}`}>
          <AnimatePresence>
              {selectedFilesForSummary.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
                      <button onClick={handleMultiFileSummarize} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white font-semibold rounded-full shadow-lg hover:bg-green-600"><Lightbulb size={18} /><span>Summarize {selectedFilesForSummary.length} File(s)</span></button>
                  </motion.div>
              )}
          </AnimatePresence>
          {selectedFile && (
            <button onClick={handleGenerateMindMap} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-full shadow-lg hover:bg-blue-700 disabled:bg-gray-400">Generate Mind Map</button>
          )}
          <button onClick={() => navigate("/mindmap", { state: { sessionId: selectedChat } })} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-semibold rounded-full shadow-lg hover:bg-purple-700">View Mind Map</button>
      </div>

      <div className="hidden lg:block">
          <button onClick={() => setLeftOpen(p => !p)} className="absolute top-1/2 -translate-y-1/2 z-10 w-6 h-16 bg-gray-600/50 hover:bg-gray-600 transition-all text-white flex items-center justify-center rounded-r-lg" style={{left: leftOpen ? '20rem' : '0rem'}}><ChevronLeft className={`transition-transform ${!leftOpen && 'rotate-180'}`}/></button>
          <button onClick={() => setRightOpen(p => !p)} className="absolute top-1/2 -translate-y-1/2 z-10 w-6 h-16 bg-gray-600/50 hover:bg-gray-600 transition-all text-white flex items-center justify-center rounded-l-lg" style={{right: rightOpen ? '20rem' : '0rem'}}><ChevronRight className={`transition-transform ${!rightOpen && 'rotate-180'}`}/></button>
      </div>
    </div>
  </>
);
};

export default WorkArea;