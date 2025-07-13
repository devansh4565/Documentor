import React, { useState, useEffect, useRef, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useLocation, useNavigate } from "react-router-dom";
import { Sun, Moon, ChevronLeft, ChevronRight, Menu, Lightbulb } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { Document, Page, pdfjs } from 'react-pdf';
import axios from "axios";
import { motion, AnimatePresence } from 'framer-motion';
import Header from './Header';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase"; // Import the instance
import useFirebaseUser from "../hooks/useFirebaseUser";

// CSS Imports for react-pdf are essential for rendering
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// PDF.js worker configuration
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;


// =================================================================
// --- MAIN WORKAREA COMPONENT ---
// =================================================================

const WorkArea = ({ initialSessions, setInitialSessions }) => {
  // --- STATE, REFS, AND HOOKS ---
  const API = process.env.REACT_APP_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'https://documentor-backend-btiq.onrender.com';
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const { user: firebaseUser, authReady, getIdToken } = useFirebaseUser();
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [mobileDrawer, setMobileDrawer] = useState(null);
  const hasAutoSelected = useRef(false);
  const [showNewChatPopup, setShowNewChatPopup] = useState(false);
  const [newChatName, setNewChatName] = useState("");
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [sessionFiles, setSessionFiles] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [botTyping, setBotTyping] = useState("");
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [selectedFilesForSummary, setSelectedFilesForSummary] = useState([]);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const messagesEndRef = useRef(null);
  const contextMenuRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mindMapExists, setMindMapExists] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const pdfWrapperRef = useCallback(node => {
    // This function runs when the ref is attached to the div.
    if (node !== null) {
        // We get the width and update our state.
        setContainerWidth(node.getBoundingClientRect().width);
    }
  }, []);


  // --- EFFECTS ---

  useEffect(() => {
    console.log('%cWorkArea MOUNTED', 'color: green; font-weight: bold;');
    return () => console.log('%cWorkArea UNMOUNTED', 'color: red; font-weight: bold;');
  }, []);
  // In WorkArea.jsx, with your other useEffects

useEffect(() => {
    const checkMindMapStatus = async () => {
        // If no file is selected, reset the state.
        if (!selectedFile) {
            setMindMapExists(false);
            return;
        }
        try {
            // Call the new file-specific existence endpoint
            const res = await axios.get(`${API}/api/mindmap/exists/file/${selectedFile._id}`);
            setMindMapExists(res.data.exists);
        } catch (error) {
            console.error("Failed to check mind map status:", error);
            setMindMapExists(false);
        }
    };

    checkMindMapStatus();
}, [selectedFile, API]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const token = await user.getIdToken();
          const response = await fetch(`${API}/api/chats`, { headers: { Authorization: `Bearer ${token}` } });
          if (!response.ok) throw new Error("Failed to fetch sessions");
          const sessionsArray = await response.json();
          const sessionsObject = {};
          if (Array.isArray(sessionsArray)) {
            sessionsArray.forEach((session) => { sessionsObject[session._id] = session; });
          }
          if (typeof setInitialSessions === 'function') setInitialSessions(sessionsObject);
        } catch (error) { console.error("Failed to fetch initial sessions:", error); }
      } else {
        if (typeof setInitialSessions === 'function') setInitialSessions({});
      }
    });
    return () => unsubscribe();
  }, [API, setInitialSessions]);

  useEffect(() => {
    if (!authReady || !firebaseUser) return;
    const sessionIds = Object.keys(initialSessions || {});
    const sortedIds = Object.values(initialSessions || {}).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).map(s => s._id);
    if (sortedIds.length > 0 && !hasAutoSelected.current) {
      setSelectedChat(sortedIds[0]);
      hasAutoSelected.current = true;
    }
  }, [initialSessions, authReady, firebaseUser]);
  
  useEffect(() => {
    const fetchSessionData = async () => {
        if (!selectedChat || !authReady || !firebaseUser) return;
        setLoading(true);
        try {
            const token = await getIdToken();
            if (!token) throw new Error("User not authenticated.");
            const authHeaders = { 'Authorization': `Bearer ${token}` };
            const [filesRes, messagesRes] = await Promise.all([
                fetch(`${API}/api/files/${selectedChat}`, { headers: authHeaders }),
                fetch(`${API}/api/chats/${selectedChat}/messages`, { headers: authHeaders }),
            ]);
            if (!filesRes.ok) throw new Error('Failed to fetch files');
            if (!messagesRes.ok) throw new Error('Failed to fetch messages');
            const filesData = await filesRes.json();
            const messagesData = await messagesRes.json();
            setSessionFiles(filesData || []);
            const formattedMessages = (messagesData || []).map(dbMsg => ({ sender: dbMsg.role, text: dbMsg.content, _id: dbMsg._id }));
            setMessages(formattedMessages);
        } catch (err) {
            console.error("Failed to fetch session data:", err);
            setSessionFiles([]);
            setMessages([]);
        } finally { setLoading(false); }
    };
    fetchSessionData();
  }, [selectedChat, authReady, firebaseUser, getIdToken, API]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, botTyping]);
  
  useEffect(() => {
    const handleClickOutside = (e) => { if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) setContextMenu(null); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- MEMOIZED CALLBACKS ---
  
  const createChat = useCallback(async () => {
    if (!firebaseUser || !newChatName.trim()) return;
    try {
      const token = await getIdToken();
      const res = await axios.post(`${API}/api/chats`, { name: newChatName }, { headers: { Authorization: `Bearer ${token}` } });
      setInitialSessions((prev) => ({ [res.data._id]: res.data, ...prev }));
      setSelectedChat(res.data._id);
      setShowNewChatPopup(false);
      setNewChatName("");
    } catch (err) { console.error("Failed to create chat:", err); }
  }, [firebaseUser, newChatName, API, getIdToken, setInitialSessions]);

const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0 || !firebaseUser) return;

    const file = acceptedFiles[0];
    setIsUploading(true);
    setUploadProgress(0); // Reset progress

    try {
        const token = await getIdToken();
        if (!token) throw new Error("Authentication failed");

        const formData = new FormData();
        formData.append("file", file);
        if (selectedChat) formData.append("sessionId", selectedChat);

        // Use axios for progress tracking
        const res = await axios.post(`${API}/api/upload`, formData, {
            headers: { Authorization: `Bearer ${token}` },
            onUploadProgress: (progressEvent) => {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setUploadProgress(percentCompleted);
            },
        });
        
        const newFileFromDB = res.data;

        // If a new session was created on the backend, update our sessions list
        if (!selectedChat) {
            const newSessionId = newFileFromDB.sessionId;
            const newSession = { _id: newSessionId, name: file.name, user: firebaseUser.uid, createdAt: new Date().toISOString() };
            setInitialSessions(prev => ({ [newSessionId]: newSession, ...prev }));
            setSelectedChat(newSessionId);
        }
        
        // --- THIS IS THE FIX ---
        // ✅ Add the newly uploaded file to the list of files for this session.
        setSessionFiles(prevFiles => [...prevFiles, newFileFromDB]);

        // ✅ Automatically select the new file to be displayed in the viewer.
        setSelectedFile(newFileFromDB);
        // ----------------------

    } catch (err) {
        console.error("onDrop handler failed:", err);
        alert(`Upload Error: ${err.message || 'An unknown error occurred'}`);
    } finally {
        setIsUploading(false);
        setUploadProgress(0);
    }
}, [selectedChat, API, getIdToken, firebaseUser, setInitialSessions]);

const handleSendMessage = useCallback(async () => {
    // 1. Guard Clause & Optimistic UI for user message
    if (!newMessage.trim() || !selectedChat) return;
    const userMessageText = newMessage;
    const optimisticUserMessage = { _id: `temp-user-${Date.now()}`, sender: 'user', text: userMessageText };
    setMessages(prev => [...prev, optimisticUserMessage]);
    setNewMessage("");
    setLoading(true);

    try {
        const token = await getIdToken();
        const authHeader = { headers: { Authorization: `Bearer ${token}` } };
        const historyForAPI = [...messages, optimisticUserMessage].slice(-8).map(msg => ({ role: msg.sender, content: msg.text }));

        // 2. Save user message and get AI response in parallel
        const userMessagePromise = axios.post(`${API}/api/chats/${selectedChat}/messages`, { role: "user", content: userMessageText }, authHeader);
        const aiResultPromise = axios.post(`${API}/api/ask`, { history: historyForAPI, fileContent: selectedFile?.content || "" }, authHeader);
        
        const [, aiResult] = await Promise.all([userMessagePromise, aiResultPromise]);
        
        const botResponseText = aiResult.data.response || "I'm sorry, I encountered an error.";
        setLoading(false);

        // 3. Animate the bot's response using the `botTyping` state
        let i = 0;
        const typingInterval = setInterval(() => {
            if (i < botResponseText.length) {
                setBotTyping(botResponseText.slice(0, i + 1));
                i++;
            } else {
                // --- THIS IS THE CRITICAL FIX ---
                clearInterval(typingInterval);

                // A. Create the final bot message object for the UI
                const finalBotMessage = {
                    _id: `temp-bot-${Date.now()}`, // Give it a temporary ID
                    sender: 'assistant',
                    text: botResponseText, // Use the fully animated text
                };

                // B. Add the final message to the state and clear the animation
                setMessages(prev => [...prev, finalBotMessage]);
                setBotTyping("");

                // C. Asynchronously save the bot's message to the database in the background.
                // We don't need to wait for this to finish to show the message.
                // This is a "fire and forget" operation from the UI's perspective.
                axios.post(
                    `${API}/api/chats/${selectedChat}/messages`,
                    { role: "assistant", content: botResponseText },
                    authHeader
                ).catch(err => {
                    console.error("Background save of bot message failed:", err);
                    // The user doesn't need to see an error here, the message is already in the chat.
                });
                // ------------------------------------
            }
        }, 30);

    } catch (err) {
        console.error("Error in handleSendMessage:", err);
        setLoading(false);
        setBotTyping("");
        setMessages(prev => [...prev, { _id: `err-${Date.now()}`, sender: 'assistant', text: '⚠️ Error getting response.' }]);
    }
}, [newMessage, selectedChat, messages, selectedFile, API, getIdToken]);

  const handleRightClick = useCallback((e, sessionId) => {
    e.preventDefault();
    setContextMenu({ x: e.pageX, y: e.pageY, sessionId });
  }, []);

// In frontend/src/components/WorkArea.jsx
// In WorkArea.jsx, inside the component, with your other useCallback hooks

// In WorkArea.jsx
const handleGenerateMindMap = useCallback(async () => {
    if (!selectedFile?.content) {
        alert("Please select a file to generate a mind map.");
        return;
    }
    setLoading(true);
    try {
        // Generate the map data from the AI (this part is the same)
        const res = await axios.post(`${API}/api/generate-mindmap`, { documentText: selectedFile.content });
        const mindMapData = res.data;

        // ✅ FIX: Save the map against the fileId
        await axios.post(
            `${API}/api/mindmap/file/${selectedFile._id}`,
            { data: mindMapData }
        );

        setMindMapExists(true); // Update UI state instantly
        
        // Navigate to the mind map page, passing the fileId
        navigate('/mindmap', { state: { fileId: selectedFile._id } });

    } catch (err) {
        // ... error handling ...
    } finally {
        setLoading(false);
    }
}, [selectedFile, API, navigate, setLoading]); // Update dependencies

const exportChat = useCallback(() => {
    // 1. Guard Clause: Don't do anything if there are no messages to export.
    if (messages.length === 0) {
        alert("There are no messages in this chat to export.");
        return;
    }

    // 2. Format the chat content into a readable string.
    // We'll add a header with the chat name and export date.
    const chatName = initialSessions[selectedChat]?.name || 'Untitled Chat';
    const exportDate = new Date().toLocaleString();

    let fileContent = `Chat Export\n`;
    fileContent += `Session: ${chatName}\n`;
    fileContent += `Exported on: ${exportDate}\n`;
    fileContent += `------------------------------------\n\n`;

    fileContent += messages.map(msg => {
        const timestamp = msg.createdAt || new Date().toISOString(); // Use message timestamp if available
        const sender = msg.sender.charAt(0).toUpperCase() + msg.sender.slice(1); // Capitalize sender
        return `[${sender} - ${new Date(timestamp).toLocaleTimeString()}]\n${msg.text}\n`;
    }).join("\n------------------------------------\n\n");

    // 3. Create a 'Blob' from the text content.
    // A Blob is a file-like object of immutable, raw data.
    const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });

    // 4. Create a temporary URL for the Blob.
    const url = URL.createObjectURL(blob);

    // 5. Create a temporary anchor (<a>) element to trigger the download.
    const link = document.createElement("a");
    link.href = url;
    
    // Sanitize the chat name to create a valid filename.
    const safeChatName = chatName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `chat_export_${safeChatName}.txt`;
    
    // 6. Programmatically "click" the link to start the download.
    document.body.appendChild(link); // Required for Firefox
    link.click();
    
    // 7. Clean up by removing the temporary link and revoking the URL.
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

}, [messages, initialSessions, selectedChat]); // Add dependencies

  // --- useDropzone hook (stable config) ---
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
  });

  const onDocumentLoadSuccess = ({ numPages: nextNumPages }) => setNumPages(nextNumPages);
  const goToPrevPage = () => setPageNumber(p => Math.max(p - 1, 1));
  const goToNextPage = () => setPageNumber(p => Math.min(p + 1, numPages));
  
  const { user } = useFirebaseUser(); // Get user for Header

   // =================================================================
  // --- ADD THIS SECTION ---
  // =================================================================

  const leftPanel = (
    <>
      <div className="flex-1 min-h-0 p-4 flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-bold text-center mb-4">File List</h2>
          <div {...getRootProps()} className={`p-4 text-center border-2 border-dashed rounded-lg cursor-pointer transition-colors relative ${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'} ${isDragActive ? 'bg-blue-500/10' : 'hover:bg-gray-500/10'}`}>
              <input {...getInputProps()} />
              {isUploading ? (
                  <div className="w-full">
                      <p className="text-sm font-semibold mb-2">
                          {uploadProgress < 100 ? `Uploading... ${uploadProgress}%` : 'Processing PDF (OCR)...'}
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                          <div 
                              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                              style={{ width: `${uploadProgress}%` }}
                          ></div>
                      </div>
                  </div>
              ) : (
                  <p className="text-sm font-medium">{isDragActive ? "Drop files here..." : "Drag & drop or click"}</p>
              )}
          </div>
          <div className="space-y-2 mt-4 max-h-48 overflow-y-auto pr-2">
            {sessionFiles.map((file) => {
              const isSelectedForSummary = selectedFilesForSummary.some(f => f._id === file._id);
              const toggleSelectForSummary = () => setSelectedFilesForSummary(p => isSelectedForSummary ? p.filter(f => f._id !== file._id) : [...p, file]);
              return (
                <div key={file._id} className={`p-2 rounded-lg flex items-center justify-between transition-colors ${selectedFile?._id === file._id ? 'bg-blue-200 dark:bg-purple-800' : 'bg-gray-100 dark:bg-gray-700'}`}>
                  <div className="flex-1 min-w-0 pr-2 cursor-pointer" onClick={() => setSelectedFile(file)}>
                    <p className="font-medium text-sm truncate">{file.name}</p>
                  </div>
                  <input type="checkbox" checked={isSelectedForSummary} onChange={toggleSelectForSummary} onClick={e => e.stopPropagation()} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex-1 flex flex-col min-h-0">
          <h2 className="text-xl font-bold text-center mb-4">Previous Chats</h2>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-2">
            {Object.values(initialSessions || {})
              .filter(session => session?.name && session?.createdAt)
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .map((session) => (
                <div key={session._id} onClick={() => setSelectedChat(session._id)} onContextMenu={(e) => handleRightClick(e, session._id)} className={`p-2 rounded-lg cursor-pointer transition-colors ${selectedChat === session._id ? "bg-blue-200 dark:bg-purple-800" : "bg-gray-100 dark:bg-gray-700"}`}>
                  <p className="text-sm font-medium truncate">{session.name}</p>
                  <p className="text-xs text-gray-500">{new Date(session.createdAt).toLocaleString()}</p>
                </div>
              ))}
          </div>
        </div>
      </div>
      <div className="flex-shrink-0 p-4 border-t dark:border-gray-700">
        <button onClick={() => setShowNewChatPopup(true)} className={`w-full py-2.5 font-semibold rounded-lg text-white shadow-md transition-all ${theme === 'dark' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}>+ New Chat</button>
      </div>
    </>
  );

  const rightPanel = (
    <>
      <div className="flex-shrink-0 p-4 border-b dark:border-gray-700 flex justify-between items-center">
        <h2 className="text-xl font-bold">Chat</h2>
        <button onClick={exportChat} className="text-sm px-3 py-1.5 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600">Export</button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg._id || `msg-${msg.text.slice(0, 10)}`} className={`p-3 rounded-xl max-w-[85%] break-words ${msg.sender === 'user' ? 'ml-auto bg-green-200 dark:bg-green-800' : 'bg-gray-200 dark:bg-gray-700'}`}>
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
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
          />
          <button onClick={handleSendMessage} disabled={loading} className={`px-4 font-semibold rounded-lg text-white ${theme === 'dark' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'} disabled:bg-gray-400`}>Send</button>
        </div>
      </div>
    </>
  );
  return (
    <>
      <div className={`h-screen w-full flex overflow-hidden ${theme === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-blue-50 text-gray-900'}`}>
        {mobileDrawer && <div onClick={() => setMobileDrawer(null)} className="fixed inset-0 z-30 bg-black/40 lg:hidden"></div>}

        <aside className={`w-80 flex-col flex-shrink-0 hidden lg:flex ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} transition-all duration-300 ${leftOpen ? 'ml-0' : '-ml-80'}`}>
         {leftPanel}
        </aside>
        
        <aside className={`fixed top-0 left-0 w-80 h-full z-40 flex flex-col shadow-xl lg:hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} transition-transform duration-300 ${mobileDrawer === 'left' ? 'translate-x-0' : '-translate-x-full'}`}>
        { leftPanel }
        </aside>

        <main className="flex-1 flex flex-col h-full overflow-hidden relative">
          <Header user={user} />
          <div className="flex-1 flex flex-col h-full">
            {selectedFile ? (
              <div className="flex flex-col h-full p-4">
                <h1 className="flex-shrink-0 text-center font-semibold mb-2 text-lg">{selectedFile.name}</h1>
                <div ref={pdfWrapperRef} className="flex-1 w-full min-h-0 overflow-y-auto flex justify-center py-2 bg-gray-200/30 dark:bg-black/20 rounded-lg">
                          
                          {/* ✅ RENDER ONLY WHEN WIDTH IS KNOWN */}
                          {selectedFile?.url && containerWidth > 0 && (
                            <Document
                              file={selectedFile.url} // Use the full Cloudinary URL
                              onLoadSuccess={onDocumentLoadSuccess}
                              key={selectedFile._id}
                            >
                              <Page
                                pageNumber={pageNumber}
                                // ✅ USE THE STATE VARIABLE FOR WIDTH
                                width={containerWidth - 40} // Subtract padding
                              />
                            </Document>
                  )}
                </div>
                {numPages && (
                  <div className="flex-shrink-0 mt-2 flex justify-center">
                    <div className="flex items-center p-1 bg-gray-200 dark:bg-gray-700 rounded-full shadow-md">
                      <button onClick={goToPrevPage} disabled={pageNumber <= 1} className="px-3 py-1">Prev</button>
                      <span className="px-3"> Page {pageNumber} of {numPages} </span>
                      <button onClick={goToNextPage} disabled={pageNumber >= numPages} className="px-3 py-1">Next</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center p-4 text-center">
                <div className="max-w-md">
                  <Lightbulb className="mx-auto h-12 w-12 text-gray-400" />
                  <h2 className="mt-2 text-xl font-semibold text-gray-400">Select a file or chat to get started</h2>
                  <p className="mt-1 text-sm text-gray-500">Upload a PDF in the left panel, choose a document, and start interacting with your personal AI assistant.</p>
                </div>
              </div>
            )}
          </div>
        </main>

        <aside className={`w-80 flex-col flex-shrink-0 hidden lg:flex ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} transition-all duration-300 ${rightOpen ? 'mr-0' : '-mr-80'}`}>
            {rightPanel}
        </aside>
        
        <aside className={`fixed top-0 right-0 w-80 h-full z-40 flex flex-col shadow-xl lg:hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} transition-transform duration-300 ${mobileDrawer === 'right' ? 'translate-x-0' : 'translate-x-full'}`}>
          { rightPanel }
        </aside>

        {/* Popups and Absolute Elements */}
        <AnimatePresence>
          {showNewChatPopup && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center" onClick={() => setShowNewChatPopup(false)}>
              <motion.div initial={{ scale: 0.9, y: -20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: -20, opacity: 0 }} className={`p-6 rounded-xl shadow-2xl w-full max-w-md ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-4">Create New Chat</h2>
                <input type="text" value={newChatName} onChange={(e) => setNewChatName(e.target.value)} placeholder="Enter chat name..." className={`w-full p-2 border rounded-lg mb-4 ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'}`} onKeyDown={(e) => e.key === 'Enter' && createChat()} />
                <div className="flex justify-end gap-3">
                  <button onClick={() => setShowNewChatPopup(false)} className={`px-4 py-2 rounded-lg font-semibold transition-colors ${theme === 'dark' ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-200 hover:bg-gray-300'}`}>Cancel</button>
                  <button onClick={createChat} className={`px-4 py-2 rounded-lg font-semibold text-white transition-colors ${theme === 'dark' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}>Create</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute top-4 right-4 z-20 flex items-center gap-4">
                <button
                  onClick={toggleTheme}
                  className={`absolute top-6 right-6 p-2 rounded-full shadow hover:scale-105 transition-all duration-300 ring-2 ring-offset-2 ${
                    theme === 'light' ? 'bg-blue-200 hover:bg-blue-300 text-blue-800 ring-blue-400' : 'bg-purple-700 hover:bg-purple-600 text-yellow-300 ring-purple-400'
                  }`}
                >
                  {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                </button>            <div className="lg:hidden flex gap-2">
                <button onClick={() => setMobileDrawer('left')}><Menu size={22}/></button>
                <button onClick={() => setMobileDrawer('right')}><Menu size={22}/></button>
            </div>
        </div>
        <div className={`absolute bottom-6 z-20 flex flex-col items-end gap-3 transition-all duration-300 ${rightOpen && isDesktop ? 'right-[22rem]' : 'right-6'}`}>

            {/* --- 1. The Multi-File Summarize Button --- */}
            <AnimatePresence>
                {selectedFilesForSummary.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                    >
                        <button
                            onClick={() => { /* Make sure handleMultiFileSummarize exists */ }}
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
            {/* This button only appears when a single file is selected for viewing. */}
            {selectedChat && ( // Only show any mind map button if a chat session is active
                mindMapExists ? (
                    // If mindMapExists is true, show the "View" button
                    <button
                        onClick={() => navigate("/mindmap", { state: { fileId: selectedFile._id } })}
                        className="flex items-center gap-3 px-5 py-3 bg-purple-600 text-white font-semibold rounded-full shadow-lg hover:bg-purple-700"
                    >
                        {/* You can add a "View" icon here */}
                        <span>View Mind Map</span>
                    </button>
                ) : (
                    // If mindMapExists is false, show the "Generate" button
                    <button
                        onClick={handleGenerateMindMap}
                        // Disable the button if no file is selected for viewing, or if loading
                        disabled={loading}
                        className="flex items-center gap-3 px-5 py-3 bg-blue-600 text-white font-semibold rounded-full shadow-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {/* You can add a "Generate" icon here */}
                        <span>Generate Mind Map</span>
                    </button>
                )
            )}

        </div>

        <div className="hidden lg:block">
            <button onClick={() => setLeftOpen(p => !p)} className="absolute top-1/2 -translate-y-1/2 z-10 w-6 h-16 bg-gray-600/50 hover:bg-gray-600 text-white flex items-center justify-center rounded-r-lg" style={{left: leftOpen ? '20rem' : '0rem'}}><ChevronLeft className={`transition-transform ${!leftOpen && 'rotate-180'}`}/></button>
            <button onClick={() => setRightOpen(p => !p)} className="absolute top-1/2 -translate-y-1/2 z-10 w-6 h-16 bg-gray-600/50 hover:bg-gray-600 text-white flex items-center justify-center rounded-l-lg" style={{right: rightOpen ? '20rem' : '0rem'}}><ChevronRight className={`transition-transform ${!rightOpen && 'rotate-180'}`}/></button>
        </div>
      </div>
    </>
  );
};

export default WorkArea;