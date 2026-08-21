import { db } from '../config/firebase.js';
import asyncHandler from '../utils/asyncHandler.js';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ==========================================
// PRODUCT SEARCH CACHE
// ==========================================
// Stores only lightweight product names/IDs in backend memory.
// The browser never receives the full search index.

let productSearchIndex = null;
let productSearchIndexLoadedAt = 0;

const SEARCH_INDEX_TTL = 10 * 60 * 1000; // 10 minutes


// ==========================================
// GET PRODUCTS
// ==========================================
export const getProducts = asyncHandler(async (req, res) => {
  const { category, cursor, limit = 50 } = req.query;
  const pageSize = parseInt(limit, 10);

  try {
    let query = db.collection('products');

    if (category && category !== 'All') {
      query = query.where('category', '==', category);
    }

    query = query
      .orderBy('public_sentiment_score', 'desc')
      .limit(pageSize);

    if (cursor) {
      const cursorDoc = await db
        .collection('products')
        .doc(cursor)
        .get();

      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.get();

    const products = [];
    let lastVisibleId = null;

    snapshot.forEach(doc => {
      products.push({
        product_id: doc.id,
        ...doc.data()
      });

      lastVisibleId = doc.id;
    });

    res.status(200).json({
      products,
      lastVisible: lastVisibleId,
      hasMore: products.length === pageSize
    });

  } catch (error) {
    console.error('❌ Error fetching products:', error);

    res.status(500).json({
      message: "Error fetching products."
    });
  }
});


// ==========================================
// GET PRODUCT BY ID
// ==========================================
export const getProductById = asyncHandler(async (req, res) => {
  const docRef = db
    .collection('products')
    .doc(req.params.id);

  const doc = await docRef.get();

  if (!doc.exists) {
    return res.status(404).json({
      message: 'Product not found'
    });
  }

  res.status(200).json({
    product_id: doc.id,
    ...doc.data()
  });
});


// ==========================================
// ADD PRODUCT REVIEW
// ==========================================
export const addProductReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reviewText } = req.body;
  const userId = req.user.uid;

  if (!reviewText) {
    return res.status(400).json({
      message: "Review text is required"
    });
  }

  const productRef = db
    .collection('products')
    .doc(id);

  const doc = await productRef.get();

  if (!doc.exists) {
    return res.status(404).json({
      message: "Product not found"
    });
  }

  const product = doc.data();

  const updatedReviews = product.reviews
    ? `${product.reviews} | ${reviewText}`
    : reviewText;

  const currentScore =
    Number(product.public_sentiment_score) || 50;

  let newScore = currentScore;
  let calculatedImpact = 0;

  // ==========================================
  // ATTEMPT 1: PYTHON SENTIMENT ENGINE
  // ==========================================
  try {
    const pythonRes = await axios.post(
      'http://127.0.0.1:5001/api/analyze-sentiment',
      {
        base_score: currentScore,
        review: reviewText
      }
    );

    newScore = pythonRes.data.new_score;
    calculatedImpact = newScore - currentScore;

  } catch (error) {

    console.warn(
      "Python ML Engine offline. Activating Gemini fallback..."
    );

    // ==========================================
    // ATTEMPT 2: GEMINI SENTIMENT FALLBACK
    // ==========================================
    const genAI = new GoogleGenerativeAI(
      process.env.GEMINI_API_KEY
    );

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash'
    });

    const prompt = `
Analyze this product review:

"${reviewText}"

Classify the sentiment into EXACTLY ONE of:

POSITIVE
NEGATIVE
NEUTRAL

Respond with ONLY the single word.
No punctuation.
No markdown.
No explanation.
`;

    try {
      const result = await model.generateContent(prompt);

      const sentiment = result.response
        .text()
        .trim()
        .toUpperCase();

      if (sentiment.includes('NEGATIVE')) {
        calculatedImpact = -5.0;
      } else if (sentiment.includes('POSITIVE')) {
        calculatedImpact = 5.0;
      } else {
        calculatedImpact = 0.0;
      }

      newScore = Math.max(
        0,
        Math.min(100, currentScore + calculatedImpact)
      );

      calculatedImpact = newScore - currentScore;

    } catch (aiError) {
      console.error(
        "❌ Gemini classification failure:",
        aiError.message
      );
    }
  }

  // ==========================================
  // UPDATE PRODUCT
  // ==========================================
  await productRef.update({
    reviews: updatedReviews,
    public_sentiment_score: newScore
  });

  // ==========================================
  // SAVE USER REVIEW HISTORY
  // ==========================================
  await db.collection('user_reviews').add({
    userId: userId,
    productId: id,
    productName: product.product_name,
    category: product.category,
    reviewText: reviewText,
    sentimentImpact: calculatedImpact,
    createdAt: new Date().toISOString()
  });

  res.status(200).json({
    message: "Review added",
    reviews: updatedReviews,
    newScore
  });
});


// ==========================================
// UNIVERSAL PRODUCT SEARCH
// ==========================================
// Searches the complete product catalog on the backend.
//
// Browser:
// - Never downloads all products
// - Receives maximum 20 matching products
//
// Backend:
// - Keeps lightweight name/id search index in memory
// - Refreshes index every 10 minutes
// ==========================================
export const searchProducts = asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q || !q.trim()) {
    return res.status(200).json([]);
  }

  const searchQuery = q
    .trim()
    .toLowerCase();

  try {
    // ==========================================
    // STEP 1: BUILD / REFRESH SEARCH INDEX
    // ==========================================
    const now = Date.now();

    const cacheExpired =
      !productSearchIndex ||
      now - productSearchIndexLoadedAt > SEARCH_INDEX_TTL;

    if (cacheExpired) {
      console.log("🔍 Building product search index...");

      const snapshot = await db
        .collection('products')
        .get();

      productSearchIndex = [];

      snapshot.forEach(doc => {
        const data = doc.data();

        const productName = data.product_name
          ? String(data.product_name)
          : '';

        if (!productName) {
          return;
        }

        productSearchIndex.push({
          product_id: doc.id,
          product_name: productName,
          search_name: productName.toLowerCase()
        });
      });

      productSearchIndexLoadedAt = now;

      console.log(
        `✅ Search index loaded: ${productSearchIndex.length} products`
      );
    }

    // ==========================================
    // STEP 2: NORMALIZE SEARCH TERMS
    // ==========================================
    const words = searchQuery
      .split(/\s+/)
      .filter(Boolean);

    // ==========================================
    // STEP 3: SCORE MATCHES
    // ==========================================
    const matchedProducts = productSearchIndex
      .map(product => {
        const name = product.search_name;

        let score = 0;
        let matchedWords = 0;

        // Exact full-name match
        if (name === searchQuery) {
          score += 100;
        }

        // Starts with query
        if (name.startsWith(searchQuery)) {
          score += 60;
        }

        // Contains full query
        if (name.includes(searchQuery)) {
          score += 40;
        }

        // Match individual words
        for (const word of words) {
          if (name.includes(word)) {
            matchedWords += 1;
            score += 10;
          }
        }

        if (score === 0) {
          return null;
        }

        return {
          ...product,
          score,
          matchedWords
        };
      })
      .filter(Boolean);

    // ==========================================
    // STEP 4: SORT BEST MATCHES FIRST
    // ==========================================
    matchedProducts.sort((a, b) => {

      if (b.score !== a.score) {
        return b.score - a.score;
      }

      if (b.matchedWords !== a.matchedWords) {
        return b.matchedWords - a.matchedWords;
      }

      return a.product_name.localeCompare(
        b.product_name
      );
    });

    // ==========================================
    // STEP 5: RETURN ONLY TOP 20 PRODUCT IDs
    // ==========================================
    const topMatches = matchedProducts.slice(0, 20);

    // ==========================================
    // STEP 6: FETCH COMPLETE PRODUCT DOCUMENTS
    // ==========================================
    const productDocs = await Promise.all(
      topMatches.map(async product => {
        const doc = await db
          .collection('products')
          .doc(product.product_id)
          .get();

        if (!doc.exists) {
          return null;
        }

        return {
          product_id: doc.id,
          ...doc.data()
        };
      })
    );

    const products = productDocs.filter(Boolean);

    return res.status(200).json(products);

  } catch (error) {
    console.error(
      "❌ Product search failed:",
      error
    );

    return res.status(500).json({
      message: "Error searching products."
    });
  }
});


// ==========================================
// GET MY REVIEWS
// ==========================================
export const getMyReviews = asyncHandler(async (req, res) => {
  const userId = req.user.uid;

  const snapshot = await db
    .collection('user_reviews')
    .where('userId', '==', userId)
    .get();

  const reviews = [];

  snapshot.forEach(doc => {
    reviews.push({
      id: doc.id,
      ...doc.data()
    });
  });

  reviews.sort(
    (a, b) =>
      new Date(b.createdAt) -
      new Date(a.createdAt)
  );

  res.status(200).json(reviews);
});


// ==========================================
// ETHICAL SNAPSHOT
// ==========================================
export const getEthicalSnapshot = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const productRef = db
      .collection('products')
      .doc(id);

    const doc = await productRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        message: "Product not found"
      });
    }

    const product = doc.data();

    const genAI = new GoogleGenerativeAI(
      process.env.GEMINI_API_KEY
    );

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash'
    });

    const prompt = `
You are an ethical shopping assistant for a platform called Conscia.

Evaluate the following product:

Name: ${product.product_name}
Category: ${product.category}
Public Sentiment Score: ${product.public_sentiment_score}/100

Provide an "Ethical Snapshot" suggesting whether a conscious consumer should buy this or not.

CRITICAL RULES:
- Your response MUST be exactly 3 to 4 sentences long.
- Be direct, balanced, and easy to understand.
- Focus on general ethical and environmental considerations relevant to this type of product.
- Do not use markdown formatting.
- Do not use bullet points.
- Do not invent specific certifications, materials, labor practices, or company claims that are not provided.
`;

    const result = await model.generateContent(prompt);

    const snapshot = result.response
      .text()
      ?.trim();

    if (!snapshot) {
      throw new Error(
        "Gemini returned an empty snapshot."
      );
    }

    return res.status(200).json({
      snapshot
    });

  } catch (error) {
    console.error(
      "❌ GEMINI SNAPSHOT ERROR:",
      {
        message: error.message,
        status: error.status,
        statusText: error.statusText
      }
    );

    return res.status(503).json({
      message: "AI Analysis currently unavailable."
    });
  }
});