import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

const MobileFileList = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    const fetchFiles = async () => {
      try {
        setLoading(true);
        const res = await fetch(`http://localhost:5000/api/files/${sessionId}`);
        const data = await res.json();
        setFiles(data.files || []);
      } catch (err) {
        console.error("Failed to fetch files:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFiles();
  }, [sessionId]);

  const handleFileClick = (file) => {
    // Navigate to a dedicated mobile PDF viewer, passing state
    navigate(`/mobile/chat/${sessionId}/file/${file._id}`, { state: { file } });
  };

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900 text-black dark:text-white">
      <header className="flex-shrink-0 flex items-center justify-between p-4 border-b dark:border-gray-700 shadow-sm">
        <Link to={`/mobile/chat/${sessionId}`} className="font-semibold text-blue-600 dark:text-blue-400">← Back to Chat</Link>
        <h1 className="font-bold text-lg">Files</h1>
        <div className="w-16"></div> {/* Spacer */}
      </header>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && <p>Loading files...</p>}
        
        {!loading && files.length === 0 && (
          <p className="text-gray-500 text-center mt-8">No files have been uploaded to this chat yet.</p>
        )}
        
        {files.map((file) => (
          <div key={file._id} onClick={() => handleFileClick(file)} className="block p-4 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-sm cursor-pointer">
            <p className="font-semibold truncate">{file.name}</p>
            <p className="text-sm text-gray-500">{file.size}</p>
          </div>
        ))}
      </div>
      
      {/* A placeholder for a future upload button */}
      <footer className="p-4 border-t dark:border-gray-700">
        <button className="w-full py-2 bg-blue-600 text-white font-semibold rounded-lg">Upload New File</button>
      </footer>
    </div>
  );
};

export default MobileFileList;