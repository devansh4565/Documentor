// frontend/src/components/OcrResults.js
import React, { useEffect, useState } from "react";
import axios from "axios";

const OcrResults = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const API = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await axios.get("${import.meta.env.VITE_API_BASE_URL}/api/ocr/results");
        setResults(res.data);
      } catch (error) {
        console.error("Failed to fetch OCR results:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, []);

  if (loading) return <p>Loading OCR results...</p>;

  return (
    <div>
      <h2>📝 OCR Results</h2>
      {results.length === 0 ? (
        <p>No OCR results found.</p>
      ) : (
        <ul>
          {results.map((result) => (
            <li key={result._id}>
              <h4>{result.filename}</h4>
              <pre style={{ whiteSpace: "pre-wrap", background: "#f4f4f4", padding: "10px" }}>
                {result.text}
              </pre>
              <hr />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default OcrResults;