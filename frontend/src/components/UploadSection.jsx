import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTheme } from '../context/ThemeContext'; // <-- make sure path is correct
import { Moon, Sun } from 'lucide-react';
import { extractTextFromPDF } from "../utils/pdfOcr";


const UploadSection = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const API = import.meta.env.VITE_API_BASE_URL;

  // in frontend/src/components/UploadSection.jsx

  const onDrop = useCallback(async (acceptedFiles) => {
    // We'll handle one file for this flow for simplicity
    const file = acceptedFiles[0]; 
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      // ✅ We need to send credentials so the backend knows which user this is
      // and can assign the file correctly.
      const ocrRes = await fetch("${import.meta.env.VITE_API_BASE_URL}/api/ocr", {
        method: "POST",
        body: formData,
        credentials: 'include' // <--- THIS IS CRITICAL
      });

      if (!ocrRes.ok) {
        const errorData = await ocrRes.text();
        console.error("OCR API Error:", errorData);
        throw new Error(`OCR failed with status: ${ocrRes.status}`);
      }
      
      // This now receives the FULL file document from the database
      const fileFromDB = await ocrRes.json();
      
      // ✅ NAVIGATE WITH THE COMPLETE, CORRECTLY-STRUCTURED OBJECT
      // We don't build a custom `fileMeta` object anymore.
      navigate("/workarea", {
        state: {
          initialFile: fileFromDB // Pass the complete object, which now has a valid .url
        }
      });

    } catch (err) {
      console.error("🚨 Upload or OCR failed:", err);
      alert("Upload failed: " + err.message);
    }

  }, [navigate]); // navigate is the only dependency here

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
  });

  return (
    <div className={`relative w-full min-h-screen flex flex-col items-center pt-10 pb-24 transition-colors duration-500 ${
      theme === 'light' ? 'bg-blue-100 text-black' : 'bg-purple-950 text-white'
    }`}>

      <button
        onClick={toggleTheme}
        className={`absolute top-6 right-6 p-2 rounded-full shadow hover:scale-105 transition-all duration-300 ring-2 ring-offset-2 ${
          theme === 'light' ? 'bg-blue-200 hover:bg-blue-300 text-blue-800 ring-blue-400' : 'bg-purple-700 hover:bg-purple-600 text-yellow-300 ring-purple-400'
        }`}
      >
        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
      </button>



      <h1 className="text-5xl font-bold font-inter mb-8">DocuMentor</h1>

      {/* Upload Box */}
      <div className={`w-[900px] rounded-2xl shadow-xl mt-10 p-10 flex flex-col items-center text-center border-2 ${
        theme === 'light' ? 'bg-white border-blue-200' : 'bg-purple-800 border-purple-300'
      }`}>
        <div
          {...getRootProps()}
          className="w-full border-2 border-dashed border-gray-300 rounded-xl p-10 hover:border-purple-400 transition cursor-pointer"
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center space-y-4">
            <svg className="w-16 h-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>

            {isDragActive ? (
              <p className="font-medium">Drop your PDFs here...</p>
            ) : (
              <>
                <h2 className="text-2xl font-bold">Upload Your Document</h2>
                <p className="text-lg max-w-xl">
                  Drag and drop your PDF files here or click to browse. Start analyzing your documents with AI-powered insights.
                </p>
              </>
            )}

            <button
              className={`mt-4 font-semibold py-3 px-6 rounded-xl transition-all duration-300 hover:scale-105 ${
                theme === 'light'
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'bg-purple-700 hover:bg-purple-800 text-white'
              }`}
            >
              Choose PDF File
            </button>


          </div>
        </div>

        <div className="flex items-center my-6 w-full max-w-xl">
          <div className="flex-1 h-px bg-gray-300" />
          <span className="mx-4 text-gray-500 font-medium">or</span>
          <div className="flex-1 h-px bg-gray-300" />
        </div>

        <p className="font-medium text-gray-500">Drag your files anywhere on this area</p>
      </div>

      {/* Floating Button */}
      <button
        onClick={() => navigate('/workarea', { state: { uploadedFiles } })}
        className="fixed bottom-6 right-6 bg-[#4B4646] hover:bg-[#5b5555] text-white text-xl font-semibold px-6 py-3 rounded-full shadow-lg transition-transform transform hover:scale-105"
      >
        Recent Chats
      </button>
    </div>
  );
};

export default UploadSection;
