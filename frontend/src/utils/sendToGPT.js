// src/utils/sendToGPT.js
export const sendToGPT = async (text) => {
  try {
    const response = await fetch("${import.meta.env.VITE_API_BASE_URL}/api/gpt-summary", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) throw new Error("GPT request failed");

    const data = await response.json();
    return data.summary; // assuming your backend responds like { summary: "..." }
  } catch (error) {
    console.error("Error sending to GPT:", error);
    return "⚠️ Something went wrong while summarizing.";
  }
};
