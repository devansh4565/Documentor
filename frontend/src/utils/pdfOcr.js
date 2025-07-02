import { createWorker } from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import "pdfjs-dist/legacy/build/pdf.worker"; // automatically sets up the worker

// You don't need to manually set workerSrc in v3.4.120 with local build imports

// utils/pdfOcr.js
export async function extractTextFromPDF(file) {
  const formData = new FormData();
  formData.append("pdf", file);

  const res = await fetch(`${process.env.REACT_APP_API_BASE_URL }/api/ocr`, {
    method: "POST",
    credentials: "include", // Ensure cookies are sent for session management
    body: formData,
  });

  if (!res.ok) throw new Error("Failed to extract text");

  const data = await res.json();
  return data.text;
}
