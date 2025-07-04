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
import { getAuth } from "firebase/auth";

import useFirebaseUser from "../hooks/useFirebaseUser"; // adjust path as needed

import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";

const WorkArea = ({ user, initialSessions, setInitialSessions }) => {
  // --- State Management ---
  const API = process.env.REACT_APP_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'https://documentor-backend-btiq.onrender.com'; // Ensure this is set correctly

  // Replace all import.meta.env.VITE_API_BASE_URL with API variable in this file
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // Firebase Auth State from custom hook
  const { user: firebaseUser, authReady } = useFirebaseUser();

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
    import("firebase/auth").then(({ getAuth, onAuthStateChanged }) => {
      const auth = getAuth();
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!user) {
          console.warn("🚫 No Firebase user signed in.");
          return;
        }
        console.log("✅ Firebase user signed in:", user.email);

        const fetchSessionsWithAuth = async (user) => {
          try {
            const token = await user.getIdToken();
            const res = await fetch(`${API}/api/chats`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
              credentials: "include",
            });
            const sessionsArray = await res.json();
            console.log("🧪 sessionsArray with auth:", sessionsArray);

            const sessionObj = {};
            if (Array.isArray(sessionsArray)) {
              sessionsArray.forEach((s) => {
                sessionObj[s._id] = s;
              });
            } else {
              console.error("❌ sessionsArray is not an array:", sessionsArray);
            }

            setInitialSessions(sessionObj);

            if (sessionsArray.length > 0 && !selectedChat) {
              setSelectedChat(sessionsArray[0]._id);
            }
          } catch (err) {
            console.error("❌ Failed to auto-fetch initial sessions with auth:", err);
          }
        };

        await fetchSessionsWithAuth(user);
      });

      return () => unsubscribe();
    });
  }, []);
  // Effect to fetch all necessary data when a chat session is selected
  useEffect(() => {
    // Remove original fetchSessionData function and call

    // Add updated fetchSessionDataWithAuth function and call
    const fetchSessionDataWithAuth = async () => {
      if (!selectedChat) return;

      if (!selectedChat || selectedChat.length !== 24) {
        setSessionFiles([]);
        setMessages([]);
        setHighlightedPhrases([]);
        setSelectedFile(null);
        return;
      }
      try {
        setLoading(true);
        const token = await getIdToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const [filesRes, messagesRes, highlightsRes] = await Promise.all([
          fetch(`${API}/api/files/${selectedChat}`, {
            credentials: "include",
            headers,
          }),
          fetch(`${API}/api/chats/${selectedChat}/messages`, {
            credentials: "include",
            headers,
          }),
          fetch(`${API}/api/highlights/${selectedChat}`, {
            credentials: "include",
            headers,
          }),
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
  }, [selectedChat]);

  // Effect to scroll to the bottom of the chat window on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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

// --- The Final, Corrected createChat function ---
// --- Paste this inside your WorkArea.jsx component ---

const createChat = async () => {
  const { getAuth } = await import("firebase/auth");
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    console.error("🚫 No Firebase user signed in.");
    return;
  }

  if (!newChatName.trim()) {
    alert("Please enter a name for the new chat.");
    return;
  }

  try {
    const token = await user.getIdToken();
    const res = await fetch(`${API}/api/chats`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
      body: JSON.stringify({ name: newChatName }),
    });

    if (!res.ok) {
      throw new Error("Failed to create chat session.");
    }

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
  
  // The corrected renameChat function
  const renameChat = useCallback(async (sessionId) => {
      const newName = prompt("Enter new chat name:", initialSessions[sessionId]?.name || "");
      if (!newName?.trim()) return;
      try {
          await axios.put(`${import.meta.env.VITE_API_BASE_URL}/api/chats/${sessionId}`, { name: newName });
          setInitialSessions(prev => ({
              ...prev,
              // ✅ KEY FIX: We update session.name directly
              [sessionId]: { ...prev[sessionId], name: newName }
          }));
      } catch (err) { 
          console.error("Failed to rename chat:", err); 
      }
      finally { setContextMenu(null); }
  });
    
  const deleteChat = useCallback(async (sessionId) => {
    if (!window.confirm("Are you sure you want to delete this chat?")) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/api/chats/${sessionId}`);
      const updatedSessions = { ...initialSessions };
      delete updatedSessions[sessionId];
      setInitialSessions(updatedSessions);
      if (selectedChat === sessionId) setSelectedChat(null);
    } catch (err) { 
      console.error("Failed to delete chat:", err); 
    }
    finally { setContextMenu(null); }
  });
  
    const onDrop = useCallback(async (acceptedFiles) => {
      if (!selectedChat) {
        alert("Please select a chat session first before uploading files.");
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
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const res = await fetch(`${API}/api/ocr`, {
          method: "POST",
          body: formData,
          credentials: "include",
          headers,
        });

        if (!res.ok) throw new Error("File upload failed on the server.");

        const newFileFromDB = await res.json();
        if (!newFileFromDB._id || !newFileFromDB.name || !newFileFromDB.url) {
          alert("Upload failed: incomplete file data received.");
          return;
        }

        setSessionFiles(prevFiles => [...prevFiles, newFileFromDB]);
        setSelectedFile(newFileFromDB);

      } catch (err) {
        console.error("onDrop handler failed:", err);
        alert(`Upload Error: ${err.message}`);
      } finally {
        setIsUploading(false);
      }
    }, [selectedChat]);
  
// --- The Debug Version of handleSendMessage ---

// --- Replace your handleSendMessage with this new version ---

// in WorkArea.jsx, replace the existing handleSendMessage

const handleSendMessage = async () => {
    // 1. Guard Clause: Make sure we have something to send
    if (!newMessage.trim() || !selectedChat) {
      console.error("handleSendMessage exited: No message or no selected chat.");
      return;
    }

    const userMessageText = newMessage;
    const userMessageForState = { sender: 'user', text: userMessageText };
  
    // 2. Prepare the history for the API using the current state PLUS the new message.
    // This is the only way to avoid a "stale state" error.
    const historyForAPI = [...messages, userMessageForState]
        .slice(-8) // Send last 8 messages for context
        .map(msg => ({ role: (msg.sender === 'user' ? 'user' : 'assistant'), content: msg.text }));
    
    // 3. Perform Optimistic UI updates
    setMessages(prev => [...prev, userMessageForState]); // Add user's message immediately
    setNewMessage("");      // Clear the input
    setLoading(true);       // Show "..." dots
    setBotTyping("");       // Clear any previous typing animation

    try {
        // --- 4. Backend Operations ---
        
        // A. Save user's message
        await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/api/chats/${selectedChat}/messages`,
          { role: "user", content: userMessageText },
          { headers: { Authorization: `Bearer ${await getIdToken()}` } }
        );

        // B. Call the AI
        const res = await axios.post(`${API}/api/ask`, {
            history: historyForAPI,
            fileContent: selectedFile?.content || "",
        }, { headers: { Authorization: `Bearer ${await getIdToken()}` } });

        const botResponseText = res.data.response || "Sorry, I couldn't get a response.";

        // C. Save the bot's response
        await axios.post(
          `${API}/api/chats/${selectedChat}/messages`,
          { role: "assistant", content: botResponseText },
          { headers: { Authorization: `Bearer ${await getIdToken()}` } }
        );
        
        // --- 5. Animate the response ---
        setLoading(false); // Turn off the "..." dots

        let i = 0;
        const typingInterval = setInterval(() => {
            if (i < botResponseText.length) {
                setBotTyping(botResponseText.slice(0, i + 1));
                i++;
            } else {
                clearInterval(typingInterval);
                // The new message is { sender: 'assistant', text: '...' }
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
      // Create a user-facing message in the chat
      const fileNames = selectedFilesForSummary.map(f => f.name).join(', ');
      const userPromptMsg = {
        text: `Summarizing ${selectedFilesForSummary.length} file(s): ${fileNames}`,
        sender: "user"
      };
      setMessages(prev => [...prev, userPromptMsg]);

      try {
          // Collect all the OCR text from the selected files
          const textsToSummarize = await Promise.all(
              selectedFilesForSummary.map(file => {
                  // If the content is already loaded on the file object, use it.
                  // This assumes your file objects in `sessionFiles` have the `.content` property.
                  if (file.content) {
                      return Promise.resolve(file.content);
                  }
                  // Fallback if content isn't pre-loaded (though it should be)
                  // This part requires `extractTextFromPDF` utility if you have one.
                  // For now, we'll assume `.content` exists.
                  return Promise.resolve(""); 
              })
          );
          
          // Combine all texts into one large string for a single API call
          const combinedText = textsToSummarize.join("\n\n--- END OF DOCUMENT ---\n\n");
          
          // This can use your existing /api/ask endpoint or a new one
          const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/ask`, {
              credentials: "include", // Ensure cookies are sent for session management
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                Authorization: `Bearer ${await getIdToken()}`
              },
              body: JSON.stringify({
                  // We construct a special "history" to ask for a summary
                  history: [{ role: 'user', content: 'Please provide a concise summary of the key points from all the provided document texts.' }],
                  fileContent: combinedText,
              }),
          });

          if (!res.ok) {
              throw new Error("Failed to get summary from the AI.");
          }

          const data = await res.json();
          const summaryText = data.response || "Could not generate a summary.";

          const summaryMsg = { text: summaryText, sender: "bot" };
          setMessages(prev => [...prev, summaryMsg]);
          
          // Save summary to the database
          await axios.post(`${API}/api/chats/${selectedChat}/messages`, {
              role: 'assistant',
              content: `Summary of ${fileNames}:\n\n${summaryText}`
          }, { headers: { Authorization: `Bearer ${await getIdToken()}` } });

      } catch (err) {
          console.error("Multi-file summary failed:", err);
          const errorMsg = { text: `⚠️ Error summarizing files: ${err.message}`, sender: "bot" };
          setMessages(prev => [...prev, errorMsg]);
      } finally {
          setLoading(false);
          // Clear the selection after the operation is complete
          setSelectedFilesForSummary([]);
      }
  };
// --- The Final, Corrected handleGenerateMindMap function ---
// --- Paste this inside your WorkArea component ---

  const handleGenerateMindMap = async () => {
      if (!selectedFile?.content) {
          alert("Please select a file with content to generate a mind map.");
          return;
      }
      if (!selectedChat) {
          alert("Please select a chat session to associate this mind map with.");
          return;
      }

      setLoading(true);
      try {
          // ✅ We are explicitly setting the method to "POST"
          // and including the necessary headers and body.
          const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/generate-mindmap`, {
              method: "POST",
              credentials: "include", // Ensure cookies are sent for session management
              headers: {
                  "Content-Type": "application/json",
              },
              body: JSON.stringify({ documentText: selectedFile.content }),
          });

          if (!res.ok) {
              throw new Error("AI failed to generate a valid mind map structure.");
          }
          
          const mindMapData = await res.json();

          // Save the successfully generated map data
          await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/mindmap/${selectedChat}`, {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ data: mindMapData }),
          });

          // Navigate to the mind map page, passing the session ID so it can load the data
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
  
  // PDF Navigation and Highlighting
  const onDocumentLoadSuccess = ({ numPages: nextNumPages }) => {
    setNumPages(nextNumPages);
    setPageNumber(1);
  };
  
  const goToPrevPage = () => setPageNumber(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages));

  const highlightText = (textItem) => {
    const text = textItem.str;
    if (!highlightedPhrases?.length) return text;
    const regex = new RegExp(`(${highlightedPhrases.join('|')})`, 'gi');
    return <>{text.split(regex).map((part, index) => highlightedPhrases.some(p => p.toLowerCase() === part.toLowerCase()) ? <mark key={index} className="bg-yellow-300 dark:bg-yellow-500">{part}</mark> : <React.Fragment key={index}>{part}</React.Fragment>)}</>;
  };
  const handleRightClick = (e, sessionId) => {
  e.preventDefault();
  setContextMenu({
    visible: true,
    x: e.pageX,
    y: e.pageY,
    sessionId,
  });
};
// --- RENDER ---
  const isDark = theme === "dark";
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] }
  });

// --- Find and replace this block right before your return statement ---
      {selectedFilesForSummary.length > 0 && (
          <button
              onClick={handleMultiFileSummarize}
              className="absolute bottom-20 right-6 z-20 px-6 py-3 bg-green-600 text-white font-semibold rounded-full shadow-lg hover:bg-green-700 transition-all"
          >
              Summarize {selectedFilesForSummary.length} File(s)
          </button>
      )}


    return (
      <div className={`h-screen w-full flex overflow-hidden ${isDark ? 'bg-gray-900' : 'bg-blue-50'} transition-colors duration-300`}>
          
        {/* Backdrop for mobile drawers */}
        {mobileDrawer && <div onClick={() => setMobileDrawer(null)} className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"></div>}
        
        {/* --- Primary Layout --- */}

        {/* Desktop Left Sidebar (always in DOM for transitions) */}
        <aside className={`w-80 flex-col flex-shrink-0 hidden lg:flex ${isDark ? 'bg-gray-800' : 'bg-white'} transition-colors duration-300 ${leftOpen ? 'ml-0' : '-ml-80'}`}>
        {/* PASTE THIS ENTIRE <>...</> BLOCK IN PLACE OF <LeftPanel /> */}
        <>
            <div className="flex-1 min-h-0 p-4 flex flex-col gap-6">
                {/* File List Section */}
                <div>
                    <h2 className="text-xl font-bold text-center mb-4">File List</h2>
                    <div {...getRootProps()} className={`p-4 text-center border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDark ? 'border-gray-600' : 'border-gray-300'} ${isDragActive ? 'bg-blue-500/10' : 'hover:bg-gray-500/10'}`}>
                        <input {...getInputProps()} />
                        <p className="text-sm font-medium">{isDragActive ? "Drop files here..." : "Drag & drop or click"}</p>
                    </div>
                    <div className="space-y-2 mt-4 max-h-48 overflow-y-auto pr-2">
                        {sessionFiles.map((file) => {
                            const isSelectedForSummary = selectedFilesForSummary.some(f => f._id && file._id && f._id === file._id);

                            const toggleSelectForSummary = () => setSelectedFilesForSummary(p => isSelectedForSummary ? p.filter(f => f._id !== file._id) : [...p, file]);
                            return (
                                <div key={file._id || `${file.name}-${file.size}-${Date.now()}`} className={`p-2 rounded-lg flex items-center justify-between transition-colors ${selectedFile?._id === file._id ? 'bg-blue-200 dark:bg-purple-800' : 'bg-gray-100 dark:bg-gray-700'}`}>
                                    <div className="flex-1 min-w-0 pr-2 cursor-pointer" onClick={() => { setSelectedFile(file); if(!isDesktop) setMobileDrawer(null); }}>
                                        <p className="font-medium text-sm truncate">{file.name}</p>
                                        <p className="text-xs text-gray-500">{file.size}</p>
                                    </div>
                                    <input type="checkbox" checked={isSelectedForSummary} onChange={toggleSelectForSummary} onClick={e => e.stopPropagation()} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                                </div>
                            )
                        })}
                    </div>
                </div>
                {/* Previous Chats Section */}
                <div className="flex-1 flex flex-col min-h-0">
                    <h2 className="text-xl font-bold text-center mb-4">Previous Chats</h2>
                    <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-2">
                      {Object.entries(initialSessions || {})
                        .filter(([_, session]) => session && session.name && session.createdAt) // ✅ extra safety
                        .sort((a, b) => new Date(b[1].createdAt || 0) - new Date(a[1].createdAt || 0)) // ✅ prevent NaN
                        .map(([key, session]) => (
                          <div
                            key={key}
                            onClick={() => {
                              setSelectedChat(key);
                              if (!isDesktop) setMobileDrawer(null);
                            }}
                            className={`p-2 rounded-lg cursor-pointer transition-colors ${
                              selectedChat === key
                                ? "bg-blue-200 dark:bg-purple-800"
                                : "bg-gray-100 dark:bg-gray-700"
                            }`}
                            onContextMenu={(e) => handleRightClick(e, session._id)}
                          >
                            <p className="text-sm font-medium truncate">{session.name}</p>
                            <p className="text-xs text-gray-500">
                              {session.createdAt ? new Date(session.createdAt).toLocaleString() : "No date"}
                            </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="flex-shrink-0 p-4 border-t dark:border-gray-700">
                <button onClick={() => setShowNewChatPopup(true)} className={`w-full py-2.5 font-semibold rounded-lg text-white shadow-md transition-all ${isDark ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}>+ New Chat</button>
            </div>
        </>
        </aside>

        {/* Mobile Left Drawer */}
        <aside className={`fixed top-0 left-0 w-80 h-full z-40 flex flex-col shadow-xl lg:hidden ${isDark ? 'bg-gray-800' : 'bg-white'} transition-transform duration-300 ${mobileDrawer === 'left' ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* PASTE THIS ENTIRE <>...</> BLOCK IN PLACE OF <LeftPanel /> */}
        <>
            <div className="flex-1 min-h-0 p-4 flex flex-col gap-6">
                {/* File List Section */}
                <div>
                    <h2 className="text-xl font-bold text-center mb-4">File List</h2>
                    <div {...getRootProps()} className={`p-4 text-center border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDark ? 'border-gray-600' : 'border-gray-300'} ${isDragActive ? 'bg-blue-500/10' : 'hover:bg-gray-500/10'}`}>
                        <input {...getInputProps()} />
                        <p className="text-sm font-medium">{isDragActive ? "Drop files here..." : "Drag & drop or click"}</p>
                    </div>
                    <div className="space-y-2 mt-4 max-h-48 overflow-y-auto pr-2">
                        {sessionFiles.map((file) => {
                            const isSelectedForSummary = selectedFilesForSummary.some(f => f._id && file._id && f._id === file._id);

                            const toggleSelectForSummary = () => setSelectedFilesForSummary(p => isSelectedForSummary ? p.filter(f => f._id !== file._id) : [...p, file]);
                            return (
                                <div key={file._id || `${file.name}-${file.size}-${Date.now()}`} className={`p-2 rounded-lg flex items-center justify-between transition-colors ${selectedFile?._id === file._id ? 'bg-blue-200 dark:bg-purple-800' : 'bg-gray-100 dark:bg-gray-700'}`}>
                                    <div className="flex-1 min-w-0 pr-2 cursor-pointer" onClick={() => { setSelectedFile(file); if(!isDesktop) setMobileDrawer(null); }}>
                                        <p className="font-medium text-sm truncate">{file.name}</p>
                                        <p className="text-xs text-gray-500">{file.size}</p>
                                    </div>
                                    <input type="checkbox" checked={isSelectedForSummary} onChange={toggleSelectForSummary} onClick={e => e.stopPropagation()} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                                </div>
                            )
                        })}
                    </div>
                </div>
                {/* Previous Chats Section */}
                <div className="flex-1 flex flex-col min-h-0">
                    <h2 className="text-xl font-bold text-center mb-4">Previous Chats</h2>
                    <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-2">
                      {Object.entries(initialSessions || {})
                        .filter(([_, session]) => session && session.name && session.createdAt) // ✅ extra safety
                        .sort((a, b) => new Date(b[1].createdAt || 0) - new Date(a[1].createdAt || 0)) // ✅ prevent NaN
                        .map(([key, session]) => (
                          <div
                            key={key}
                            onClick={() => {
                              setSelectedChat(key);
                              if (!isDesktop) setMobileDrawer(null);
                            }}
                            className={`p-2 rounded-lg cursor-pointer transition-colors ${
                              selectedChat === key
                                ? "bg-blue-200 dark:bg-purple-800"
                                : "bg-gray-100 dark:bg-gray-700"
                            }`}
                            onContextMenu={(e) => handleRightClick(e, session._id)}
                          >
                            <p className="text-sm font-medium truncate">{session.name}</p>
                            <p className="text-xs text-gray-500">
                              {session.createdAt ? new Date(session.createdAt).toLocaleString() : "No date"}
                            </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="flex-shrink-0 p-4 border-t dark:border-gray-700">
                <button onClick={() => setShowNewChatPopup(true)} className={`w-full py-2.5 font-semibold rounded-lg text-white shadow-md transition-all ${isDark ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}>+ New Chat</button>
            </div>
        </>      
            </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col h-full overflow-hidden relative">
          <Header user={user} />
            {/* ... mobile menu buttons ... */}
            
            {/* This ensures any changes to `selectedFile` force a re-render of this section */}
            <div className="flex-1 flex flex-col h-full">
                {selectedFile ? (
                    <div className="flex flex-col h-full p-4">
                        <h1 className="flex-shrink-0 text-center font-semibold mb-2 text-lg">{selectedFile.name}</h1>
                        <div ref={pdfWrapperRef} className="flex-1 w-full min-h-0 overflow-y-auto flex justify-center py-2 bg-gray-200/30 dark:bg-black/20 rounded-lg">
                            {containerWidth > 0 && selectedFile?.url && (
                              <Document
                                file={`${import.meta.env.VITE_API_BASE_URL}${selectedFile.url}`}
                                onLoadSuccess={onDocumentLoadSuccess}
                                key={selectedFile._id}
                              >
                                <Page pageNumber={pageNumber} width={containerWidth} />
                              </Document>
                            )}
                        </div>
                          {numPages && (
                              <div className="flex-shrink-0 mt-2 flex justify-center">
                                  <div className="flex items-center p-1 bg-gray-200 dark:bg-gray-700 rounded-full shadow-md">
                                      <button
                                          key="prev-page"
                                          onClick={goToPrevPage}
                                          disabled={pageNumber <= 1}
                                          className="px-4 py-1 text-sm font-semibold rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                      >
                                          Prev
                                      </button>
                                      <span className="px-4 font-semibold text-sm">
                                          Page {pageNumber} of {numPages}
                                      </span>
                                      <button
                                          key="next-page"
                                          onClick={goToNextPage}
                                          disabled={pageNumber >= numPages}
                                          className="px-4 py-1 text-sm font-semibold rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                      >
                                          Next
                                      </button>
                                  </div>
                              </div>
                          )}
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center p-4 text-center">
                        <h2 className="text-xl font-semibold text-gray-400">Select a file to get started</h2>
                    </div>
                )}
            </div>
        </main>

        {/* Desktop Right Sidebar */}
        <aside className={`w-80 flex-col flex-shrink-0 hidden lg:flex ${isDark ? 'bg-gray-800' : 'bg-white'} transition-colors duration-300 ${rightOpen ? 'mr-0' : '-mr-80'}`}>
        <>
          <div className="flex-shrink-0 p-4 border-b dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-bold">Chat</h2>
            <button onClick={exportChat} className="text-sm px-3 py-1.5 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600">
              Export
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, idx) => (
              <div key={msg._id || idx} className={`...`}>
                <p className="text-sm">{msg.text}</p>
              </div>
            ))}

            {loading && (
              <div key="loading-dots" className="flex items-center gap-2 p-3">
                <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce"></div>
              </div>
            )}

            {botTyping && (
              <div key="bot-typing" className="p-3 rounded-xl w-fit max-w-[85%] bg-gray-200 dark:bg-gray-700">
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
              <button 
                onClick={handleSendMessage} 
                disabled={loading} 
                className={`px-4 font-semibold rounded-lg text-white ${isDark ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'} disabled:bg-gray-400`}
              >
                Send
              </button>
            </div>
          </div>
        </>
        </aside>

        {/* Mobile Right Drawer */}
        <aside className={`fixed top-0 right-0 w-80 h-full z-40 flex flex-col shadow-xl lg:hidden ${isDark ? 'bg-gray-800' : 'bg-white'} transition-transform duration-300 ${mobileDrawer === 'right' ? 'translate-x-0' : 'translate-x-full'}`}>
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
            {loading && <div className="flex items-center gap-2 p-3"><div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div><div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div><div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce"></div></div>}
            {botTyping && <div className="p-3 rounded-xl w-fit max-w-[85%] bg-gray-200 dark:bg-gray-700"><p className="text-sm font-mono whitespace-pre-wrap break-words">{botTyping}<span className="animate-pulse">▍</span></p></div>}
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
              <button 
                onClick={handleSendMessage} 
                disabled={loading} 
                className={`px-4 font-semibold rounded-lg text-white ${isDark ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'} disabled:bg-gray-400`}
              >
                Send
              </button>
            </div>
          </div>
        </>
        </aside>

        {/* --- ABSOLUTE/FLOATING UI ELEMENTS --- */}
        {/* By placing them here, they are anchored to the main root div and have a clear stacking order. */}
        
        {/* New Chat Popup */}
        <AnimatePresence>
            {showNewChatPopup && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center"
                    onClick={() => setShowNewChatPopup(false)}
                >
                    <motion.div 
                        initial={{ scale: 0.9, y: -20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: -20, opacity: 0 }}
                        className={`p-6 rounded-xl shadow-2xl w-full max-w-md ${isDark ? 'bg-gray-800' : 'bg-white'}`}
                        onClick={e => e.stopPropagation()}
                    >
                        <h2 className="text-2xl font-bold mb-4">Create New Chat</h2>
                        <input
                            type="text"
                            value={newChatName}
                            onChange={(e) => setNewChatName(e.target.value)}
                            placeholder="Enter chat name..."
                            className={`w-full p-2 border rounded-lg mb-4 ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'}`}
                            onKeyDown={(e) => e.key === 'Enter' && createChat()}
                        />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowNewChatPopup(false)} className={`px-4 py-2 rounded-lg font-semibold transition-colors ${isDark ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-200 hover:bg-gray-300'}`}>
                                Cancel
                            </button>
                            <button onClick={createChat} className={`px-4 py-2 rounded-lg font-semibold text-white transition-colors ${isDark ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                                Create
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>

        <div className="absolute top-4 right-4 z-20 flex items-center gap-4">
            {/* ✅ THIS IS THE CORRECT, FUNCTIONAL BUTTON */}
      <button
        onClick={toggleTheme}
        className={`p-2 bg-black/10 rounded-full shadow hover:scale-105 transition-all duration-300 ring-2 ring-offset-2 ${
          theme === 'light' ? 'bg-blue-200 hover:bg-blue-300 text-blue-800 ring-blue-400' : 'bg-purple-700 hover:bg-purple-600 text-yellow-300 ring-purple-400'
        }`}
      >
        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
      </button>
            
            {/* Mobile menu buttons */}
            <div className="lg:hidden">
                <button onClick={() => setMobileDrawer('left')} className="p-2 bg-black/10 rounded-full"><Menu size={22}/></button>
            </div>
            <div className="lg:hidden">
                <button onClick={() => setMobileDrawer('right')} className="p-2 bg-black/10 rounded-full"><Menu size={22}/></button>
            </div>
        </div>
        <div className={`absolute bottom-20 right-6 z-20 transition-opacity duration-300 
                        ${selectedFilesForSummary.length > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <button
                onClick={handleMultiFileSummarize}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white font-semibold rounded-full shadow-lg hover:bg-green-600"
            >
                <Lightbulb size={18} /> {/* Make sure Lightbulb is imported from lucide-react */}
                <span>
                    Summarize {selectedFilesForSummary.length} File{selectedFilesForSummary.length > 1 ? 's' : ''}
                </span>
            </button>
        </div>
        

          {/* Floating Action Buttons Container */}
          <div className={`absolute bottom-6 right-6 z-20 flex flex-col items-end gap-3 transition-all duration-300 ${rightOpen && isDesktop ? 'right-[22rem]' : 'right-6'}`}>

              {/* --- 1. The Multi-File Summarize Button --- */}
              {/* This button uses Framer Motion for a smooth animation. */}
              <AnimatePresence>
                  {selectedFilesForSummary.length > 0 && (
                      <motion.div
                          initial={{ opacity: 0, y: 20, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 20, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                      >
                          <button
                              onClick={handleMultiFileSummarize}
                              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white font-semibold rounded-full shadow-lg hover:bg-green-600"
                          >
                              <Lightbulb size={18} />
                              <span>
                                  Summarize {selectedFilesForSummary.length} File{selectedFilesForSummary.length > 1 ? 's' : ''}
                              </span>
                          </button>
                      </motion.div>
                  )}
              </AnimatePresence>

              {/* --- 2. The AI-Powered "Generate Mind Map" Button --- */}
              {/* This button only appears when a single file is selected. */}
              {selectedFile && (
                <button
                  onClick={handleGenerateMindMap}
                  disabled={loading}
                  className="flex items-center gap-3 px-5 py-3 bg-blue-600 text-white font-semibold rounded-full shadow-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10c0-4.42-3.58-8-8-8z"/><path d="M12 2a5 5 0 0 0-5 5c0 4.42 8 13 8 13s8-8.58 8-13a5 5 0 0 0-5-5z"/><path d="M12 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/></svg>
                  <span>Generate Mind Map</span>
                </button>
              )}

              {/* --- 3. The "View Mind Map" Button --- */}
              {/* This button is always visible. We can give it slightly different styling. */}
              <button
                onClick={() => navigate("/mindmap", { state: { sessionId: selectedChat } })}
                className="flex items-center gap-3 px-5 py-3 bg-purple-600 text-white font-semibold rounded-full shadow-lg hover:bg-purple-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-brain-circuit"><path d="M12 5a3 3 0 1 0-5.997.001A3 3 0 0 0 12 5zm0 0a3 3 0 1 0 5.997.001A3 3 0 0 0 12 5z"/><path d="M12 12a3 3 0 1 0-5.997.001A3 3 0 0 0 12 12zm0 0a3 3 0 1 0 5.997.001A3 3 0 0 0 12 12z"/><path d="M12 19a3 3 0 1 0-5.997.001A3 3 0 0 0 12 19zm0 0a3 3 0 1 0 5.997.001A3 3 0 0 0 12 19z"/><path d="M5 12h-1"/><path d="M6 12h-1"/><path d="M19 12h1"/><path d="M18 12h1"/><path d="m19.5 7.5-.4.4"/><path d="M19.1 7.1 18.7 7.5"/><path d="m4.5 7.5.4.4"/><path d="M4.9 7.1 5.3 7.5"/><path d="m19.5 16.5-.4-.4"/><path d="M19.1 16.9 18.7 16.5"/><path d="m4.5 16.5.4-.4"/><path d="M4.9 16.9 5.3 16.5"/><path d="M12 8v1"/><path d="M12 15v1"/></svg>
                <span>View Mind Map</span>
              </button>

          </div>
        
        {/* ✅ DESKTOP Toggle Buttons (re-added and corrected) */}
        <div className="hidden lg:block">
            <button onClick={() => setLeftOpen(p => !p)} className="absolute top-1/2 -translate-y-1/2 z-10 w-6 h-16 bg-gray-600/50 hover:bg-gray-600 transition-all text-white flex items-center justify-center rounded-r-lg" style={{left: leftOpen ? '20rem' : '0rem'}}>
                <ChevronLeft className={`transition-transform ${!leftOpen && 'rotate-180'}`}/>
            </button>
            <button onClick={() => setRightOpen(p => !p)} className="absolute top-1/2 -translate-y-1/2 z-10 w-6 h-16 bg-gray-600/50 hover:bg-gray-600 transition-all text-white flex items-center justify-center rounded-l-lg" style={{right: rightOpen ? '20rem' : '0rem'}}>
                <ChevronRight className={`transition-transform ${!rightOpen && 'rotate-180'}`}/>
            </button>
        </div>
        </div>
    );
};

export default WorkArea;