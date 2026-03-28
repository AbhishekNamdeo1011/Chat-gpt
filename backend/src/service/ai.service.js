const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();
const ai = new GoogleGenAI({});

async function genrateResponse(content) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: content,
    config: {
      temperature: 0.7,
      systemInstruction: "You are a helpful and friendly AI assistant. Your name is ChatGPT Clone. You are designed to be a general-purpose AI that can answer questions, provide information, and engage in conversation on a wide range of topics. Please be polite and provide informative and well-structured responses.",
    }
  });
  return response.text;
}

async function generateVector(content) {
  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: content,
    config: {
      outputDimensionality: 768
    }
  })
  return response.embeddings[0].values
}
module.exports = {
  genrateResponse,
  generateVector
} 