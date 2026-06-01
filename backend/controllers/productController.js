import { db } from '../config/firebase.js';
import asyncHandler from '../utils/asyncHandler.js';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai'; 

export const getProducts = asyncHandler(async (req, res) => {
  const { category, cursor, limit = 50 } = req.query;
  const pageSize = parseInt(limit, 10);

  try {
    let query = db.collection('products');
    if (category && category !== 'All') {
      query = query.where('category', '==', category);
    }
    query = query.orderBy('public_sentiment_score', 'desc').limit(pageSize);

    if (cursor) {
      const cursorDoc = await db.collection('products').doc(cursor).get();
      if (cursorDoc.exists) query = query.startAfter(cursorDoc);
    }

    const snapshot = await query.get();
    const products = [];
    let lastVisibleId = null;

    snapshot.forEach(doc => {
      products.push({ product_id: doc.id, ...doc.data() });
      lastVisibleId = doc.id; 
    });

    res.status(200).json({ products, lastVisible: lastVisibleId, hasMore: products.length === pageSize });
  } catch (error) {
    res.status(500).json({ message: "Error fetching products." });
  }
});

export const getProductById = asyncHandler(async (req, res) => {
  const docRef = db.collection('products').doc(req.params.id);
  const doc = await docRef.get();
  if (!doc.exists) return res.status(404).json({ message: 'Product not found' });
  res.status(200).json({ product_id: doc.id, ...doc.data() });
});

export const addProductReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reviewText } = req.body;
  const userId = req.user.uid; 

  if (!reviewText) return res.status(400).json({ message: "Review text is required" });

  const productRef = db.collection('products').doc(id);
  const doc = await productRef.get();
  if (!doc.exists) return res.status(404).json({ message: "Product not found" });

  const product = doc.data();
  const updatedReviews = product.reviews ? `${product.reviews} | ${reviewText}` : reviewText;

  // Ensure currentScore is a clean number
  const currentScore = Number(product.public_sentiment_score) || 50;
  let newScore = currentScore;
  let calculatedImpact = 0;
  
  try {
    // Attempt 1: Python Engine
    // NOTE: If your Node server is on 5000, ensure your Python server is on a different port (e.g., 5001)
    const pythonRes = await axios.post('http://127.0.0.1:5001/api/analyze-sentiment', {
      base_score: currentScore,
      review: reviewText
    });
    newScore = pythonRes.data.new_score;
    calculatedImpact = newScore - currentScore;
    
  } catch (error) {
    console.warn("Python ML Engine offline (or port collision). Activating Gemini Fallback...");
    
    // Attempt 2: Bulletproof Gemini Classification
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    // We only ask Gemini for a single word
    const prompt = `
      Analyze this product review: "${reviewText}"
      Classify the sentiment of this review into EXACTLY one of these three words:
      POSITIVE
      NEGATIVE
      NEUTRAL
      
      Respond with ONLY the single word. No punctuation, no markdown, no other text.
    `;
    
    try {
        const result = await model.generateContent(prompt);
        const sentiment = result.response.text().trim().toUpperCase();
        
        // Let standard JavaScript handle the math reliably
        if (sentiment.includes('NEGATIVE')) {
            calculatedImpact = -5.0; // Subtract 5 points for a negative review
        } else if (sentiment.includes('POSITIVE')) {
            calculatedImpact = 5.0;  // Add 5 points for a positive review
        } else {
            calculatedImpact = 0.0;  // No change for neutral
        }
        
        // Apply the impact while keeping the score between 0 and 100
        newScore = Math.max(0, Math.min(100, currentScore + calculatedImpact));
        
        // Recalculate exact impact in case we hit the 0 or 100 boundary limits
        calculatedImpact = newScore - currentScore;

    } catch (aiError) {
        console.error("Gemini classification failure:", aiError);
    }
  }

  // Update Main Document Entry
  await productRef.update({
    reviews: updatedReviews,
    public_sentiment_score: newScore
  });

  // Commit transaction log safely to Ledger History
  await db.collection('user_reviews').add({
    userId: userId,
    productId: id,
    productName: product.product_name,
    category: product.category,
    reviewText: reviewText,
    sentimentImpact: calculatedImpact,
    createdAt: new Date().toISOString()
  });

  res.status(200).json({ message: "Review added", reviews: updatedReviews, newScore });
});

export const searchProducts = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(200).json([]);
  const searchStr = q.charAt(0).toUpperCase() + q.slice(1);
  const snapshot = await db.collection('products')
    .where('product_name', '>=', searchStr)
    .where('product_name', '<=', searchStr + '\uf8ff')
    .limit(20)
    .get();

  const products = [];
  snapshot.forEach(doc => {
    products.push({ product_id: doc.id, ...doc.data() });
  });
  res.status(200).json(products);
});

export const getMyReviews = asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const snapshot = await db.collection('user_reviews').where('userId', '==', userId).get();
  const reviews = [];
  snapshot.forEach(doc => reviews.push({ id: doc.id, ...doc.data() }));
  reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.status(200).json(reviews);
});

export const getEthicalSnapshot = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const productRef = db.collection('products').doc(id);
  const doc = await productRef.get();

  if (!doc.exists) {
    return res.status(404).json({ message: "Product not found" });
  }

  const product = doc.data();
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

  const prompt = `
    You are an ethical shopping assistant for a platform called Conscia. 
    Evaluate the following product:
    Name: ${product.product_name}
    Category: ${product.category}
    Public Sentiment Score: ${product.public_sentiment_score}/100

    Provide an "Ethical Snapshot" suggesting whether a conscious consumer should buy this or not.
    CRITICAL RULES:
    - Your response MUST be exactly 3 to 4 sentences long.
    - Be direct, balanced, and focus on general ethical/environmental impact for this type of product.
    - Do not use markdown formatting (like asterisks or bold text).
  `;

  try {
    const result = await model.generateContent(prompt);
    res.status(200).json({ snapshot: result.response.text() });
  } catch (error) {
    res.status(503).json({ message: "AI Analysis currently unavailable." });
  }
});