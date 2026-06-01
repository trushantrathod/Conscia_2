import { db } from '../config/firebase.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import asyncHandler from '../utils/asyncHandler.js';

export const processChatMessage = asyncHandler(async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ message: "Message query is required." });
  }

  try {
    // ==========================================
    // STEP 1: Retrieve Knowledge from Firestore
    // ==========================================
    const queryKeywords = message.toLowerCase().split(' ').filter(word => word.length > 3);
    
    let knowledgeContext = "";
    
    // Fetching the products collection
    const kbSnapshot = await db.collection('products').limit(10).get(); 
    
    const relevantDocs = [];
    kbSnapshot.forEach(doc => {
      const data = doc.data();
      const contentString = JSON.stringify(data).toLowerCase();
      const isRelevant = queryKeywords.some(keyword => contentString.includes(keyword));
      
      if (isRelevant || queryKeywords.length === 0) {
        relevantDocs.push({ id: doc.id, ...data });
      }
    });

    if (relevantDocs.length > 0) {
      knowledgeContext = relevantDocs.map((doc, index) => 
        `Source Document [${index + 1}]:\n${JSON.stringify(doc)}`
      ).join('\n\n');
    } else {
      knowledgeContext = "No specific reference found in dataset.";
    }

    // ==========================================
    // STEP 2: Configure Strict Guardrails
    // ==========================================
    const systemInstruction = `
      You are Conscia's dedicated AI assistant.
      
      CRITICAL RULES:
      1. Greetings & Chit-chat: If the user simply says "Hi", "Hello", or asks how you are, respond naturally and politely like a helpful AI (e.g., "Hello! I am Conscia's assistant. How can I help you find a product today?").
      2. Product Queries: When the user asks ANYTHING about products, data, or features, your absolute mandate is to answer safely and EXCLUSIVELY using the verified dataset context provided below.
      3. Missing Data: If the user asks a product question and the context does not contain the answer, reply EXACTLY with: "I'm sorry, but I couldn't find that information in our verified product dataset."
      4. Do not use any outside internet knowledge or make assumptions. 
      5. Maintain a friendly but factual tone.
      
      VERIFIED DATASET CONTEXT:
      ${knowledgeContext}
    `;

    // ==========================================
    // STEP 3: Generate Response using SDK
    // ==========================================
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      systemInstruction: systemInstruction,
    });

    let responseText = "";

    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: message }] }],
        generationConfig: {
          temperature: 0.1, 
        }
      });
      responseText = result.response.text();

    } catch (apiError) {
      console.warn("⚠️ Gemini API Error:", apiError.status, apiError.statusText);
      
      if (apiError.status === 503 || apiError.status === 429) {
        return res.status(200).json({ 
          reply: "Our assistant is currently experiencing high demand. Please wait a few moments and try again!" 
        });
      }
      
      throw apiError; 
    }
    
    res.status(200).json({ 
      reply: responseText || "I'm sorry, I cannot process that request." 
    });

  } catch (error) {
    console.error("Chatbot system error:", error);
    res.status(500).json({ message: "Internal server error handling chat routing." });
  }
});