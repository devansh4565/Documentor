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
import { getAuth, onAuthStateChanged } from "firebase/auth";
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
  const pdfWrapperRef = useRef(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [selectedFilesForSummary, setSelectedFilesForSummary] = useState([]);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const messagesEndRef = useRef(null);
  const contextMenuRef = useRef(null);

  // --- EFFECTS ---

  useEffect(() => {
    console.log('%cWorkArea MOUNTED', 'color: green; font-weight: bold;');
    return () => console.log('%cWorkArea UNMOUNTED', 'color: red; font-weight: bold;');
  }, []);

  useEffect(() => {
    const auth = getAuth();
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
    try {
        const token = await getIdToken();
        const formData = new FormData();
        formData.append("file", file);
        if (selectedChat) formData.append("sessionId", selectedChat);
        
        const res = await fetch(`${API}/api/ocr`, { method: "POST", headers: { Authorization: `Bearer ${token}`}, body: formData });
        if (!res.ok) throw new Error("File upload failed");
        
        const newFileFromDB = await res.json();
        if (!selectedChat) {
            const newSessionId = newFileFromDB.sessionId;
            const newSession = { _id: newSessionId, name: file.name, user: firebaseUser.uid, createdAt: new Date().toISOString() };
            setInitialSessions(prev => ({ [newSessionId]: newSession, ...prev }));
            setSelectedChat(newSessionId);
        }
        setSessionFiles(prevFiles => [...prevFiles, newFileFromDB]);
        setSelectedFile(newFileFromDB);
    } catch (err) { console.error("onDrop failed:", err); } 
    finally { setIsUploading(false); }
  }, [selectedChat, API, getIdToken, firebaseUser, setInitialSessions]);

  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedChat) return;
    const tempId = `temp-${Date.now()}`;
    const userMessage = { sender: 'user', text: newMessage, _id: tempId };
    const historyForAPI = [...messages, userMessage].slice(-8).map(msg => ({ role: msg.sender, content: msg.text }));
    
    setMessages(prev => [...prev, userMessage]);
    setNewMessage("");
    setLoading(true);

    try {
        const token = await getIdToken();
        const authHeader = { headers: { Authorization: `Bearer ${token}` } };
        await axios.post(`${API}/api/chats/${selectedChat}/messages`, { role: "user", content: userMessage.text }, authHeader);
        const res = await axios.post(`${API}/api/ask`, { history: historyForAPI, fileContent: selectedFile?.content || "" }, authHeader);
        const botResponseText = res.data.response;
        const savedBotMessage = await axios.post(`${API}/api/chats/${selectedChat}/messages`, { role: "assistant", content: botResponseText }, authHeader);
        setMessages(prev => prev.map(m => m._id === tempId ? userMessage : m).concat(savedBotMessage.data));
    } catch (err) {
        console.error("Error in handleSendMessage:", err);
        setMessages(prev => [...prev, { sender: 'assistant', text: `⚠️ Error: ${err.message}`, _id: `err-${Date.now()}`}]);
    } finally { setLoading(false); }
  }, [newMessage, selectedChat, messages, selectedFile, API, getIdToken]);

  const handleRightClick = useCallback((e, sessionId) => {
    e.preventDefault();
    setContextMenu({ x: e.pageX, y: e.pageY, sessionId });
  }, []);

  const exportChat = useCallback(() => { /* ...export logic... */ }, [messages]);

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
          <div {...getRootProps()} className={`p-4 text-center border-2 border-dashed rounded-lg cursor-pointer transition-colors ${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'} ${isDragActive ? 'bg-blue-500/10' : 'hover:bg-gray-500/10'}`}>
            <input {...getInputProps()} />
            <p className="text-sm font-medium">{loading ? "Uploading..." : (isDragActive ? "Drop files here..." : "Drag & drop or click")}</p>
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
                  {selectedFile?.url && (
                    <Document file={`${API}${selectedFile.url}`} onLoadSuccess={onDocumentLoadSuccess} key={selectedFile._id}>
                      <Page pageNumber={pageNumber} width={pdfWrapperRef.current?.clientWidth ? pdfWrapperRef.current.clientWidth - 20 : undefined} />
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
            <button onClick={toggleTheme} className={`p-2 rounded-full shadow transition-all duration-300 ${theme === 'light' ? 'bg-blue-200 hover:bg-blue-300' : 'bg-purple-700 hover:bg-purple-600'}`}><Moon size={20} /></button>
            <div className="lg:hidden flex gap-2">
                <button onClick={() => setMobileDrawer('left')}><Menu size={22}/></button>
                <button onClick={() => setMobileDrawer('right')}><Menu size={22}/></button>
            </div>
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