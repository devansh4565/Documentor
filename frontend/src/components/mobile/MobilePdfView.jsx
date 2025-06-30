// in frontend/src/components/mobile/MobilePdfView.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// PDF.js worker configuration
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const MobilePdfView = () => {
  const { sessionId, fileId } = useParams();
  const location = useLocation();

  const [file, setFile] = useState(location.state?.file || null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(!file);
  const [error, setError] = useState(null);

  // This effect handles the case where the user refreshes the page
  // and we need to re-fetch the file data.
  useEffect(() => {
    if (!file && fileId) {
      const fetchFile = async () => {
        try {
          setLoading(true);
          // Fetch all files for the session and find the one we need
          const res = await fetch(`http://localhost:5000/api/files/${sessionId}`);
          const data = await res.json();
          const targetFile = data.files?.find(f => f._id === fileId);
          if (targetFile) {
            setFile(targetFile);
          } else {
            setError("File not found.");
          }
        } catch (err) {
          setError("Failed to load file.");
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchFile();
    }
  }, [file, fileId, sessionId]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1); // Start at the first page
  };
  
  const goToPrevPage = () => setPageNumber(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages));

  if (loading) {
    return <div className="p-4 dark:bg-gray-900 dark:text-white">Loading document...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-800">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between p-4 bg-white dark:bg-gray-900 shadow-md">
        <Link to={`/mobile/chat/${sessionId}/files`} className="font-semibold text-blue-600 dark:text-blue-400">
          ← Back
        </Link>
        <h1 className="font-bold text-md text-black dark:text-white truncate mx-4 flex-1 text-center">
          {file?.name || 'Document'}
        </h1>
        {/* Spacer to keep title centered */}
        <div className="w-12"></div> 
      </header>

      {/* Main Content: PDF Viewer */}
      <main className="flex-1 min-h-0 overflow-y-auto flex justify-center p-2">
        {file ? (
          <Document
            file={`http://localhost:5000${file.url}`}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={console.error}
            key={file._id}
          >
            {/* Omit the `width` prop to let react-pdf fill the container's width */}
            <Page pageNumber={pageNumber} renderAnnotationLayer={false} renderTextLayer={false}/>
          </Document>
        ) : (
          <p>No file selected.</p>
        )}
      </main>

      {/* Footer: Page Controls */}
      {numPages && (
        <footer className="flex-shrink-0 flex items-center justify-between p-4 bg-white dark:bg-gray-900 border-t dark:border-gray-700 shadow-top">
          <button onClick={goToPrevPage} disabled={pageNumber <= 1} className="px-5 py-2 font-semibold rounded-lg bg-gray-200 dark:bg-gray-700 disabled:opacity-50">
            Prev
          </button>
          <span className="font-semibold text-sm">
            Page {pageNumber} of {numPages}
          </span>
          <button onClick={goToNextPage} disabled={pageNumber >= numPages} className="px-5 py-2 font-semibold rounded-lg bg-gray-200 dark:bg-gray-700 disabled:opacity-50">
            Next
          </button>
        </footer>
      )}
    </div>
  );
};

export default MobilePdfView;