import { db } from '../config/firebase.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import asyncHandler from '../utils/asyncHandler.js';

export const processChatMessage = asyncHandler(async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({
      message: "Message query is required."
    });
  }

  try {
    // ==========================================
    // STEP 0: Get authenticated user
    // ==========================================
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({
        message: "User authentication required."
      });
    }

    // ==========================================
    // STEP 1: Retrieve Current User Data
    // ==========================================
    let userContext = "No user profile data found.";

    try {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();

      if (userDoc.exists) {
        const userData = userDoc.data();

        // Only include useful application-level user data.
        // Do not expose Firebase/internal authentication data.
        const safeUserData = {
          displayName: userData.displayName || null,
          email: userData.email || null,
          role: userData.role || 'user',
          createdAt: userData.createdAt || null
        };

        userContext = JSON.stringify(safeUserData);
      }
    } catch (userError) {
      console.error(
        "⚠️ Failed to retrieve user profile:",
        userError.message
      );
    }

    // ==========================================
    // STEP 2: Retrieve User Review History
    // ==========================================
    let userReviewContext = "This user has not submitted any reviews.";

    try {
      const reviewSnapshot = await db
        .collection('user_reviews')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();

      const userReviews = [];

      reviewSnapshot.forEach(doc => {
        const data = doc.data();

        userReviews.push({
          reviewId: doc.id,
          productName: data.productName || "Unknown product",
          productId: data.productId || null,
          category: data.category || null,
          reviewText: data.reviewText || "",
          sentimentImpact:
            typeof data.sentimentImpact === 'number'
              ? data.sentimentImpact
              : null,
          createdAt: data.createdAt || null
        });
      });

      if (userReviews.length > 0) {
        userReviewContext = userReviews
          .map(
            (review, index) =>
              `User Review [${index + 1}]
Product: ${review.productName}
Product ID: ${review.productId || "N/A"}
Category: ${review.category || "N/A"}
Review: ${review.reviewText}
Sentiment Impact: ${
                review.sentimentImpact !== null
                  ? review.sentimentImpact
                  : "N/A"
              }
Date: ${review.createdAt || "N/A"}`
          )
          .join('\n\n');
      }
    } catch (reviewError) {
      console.error(
        "⚠️ Failed to retrieve user reviews:",
        reviewError.message
      );
    }

    // ==========================================
    // STEP 3: Retrieve Product Knowledge
    // ==========================================
    const queryKeywords = message
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3);

    let knowledgeContext = "";

    const kbSnapshot = await db
      .collection('products')
      .limit(10)
      .get();

    const relevantDocs = [];

    kbSnapshot.forEach(doc => {
      const data = doc.data();
      const contentString = JSON.stringify(data).toLowerCase();

      const isRelevant = queryKeywords.some(keyword =>
        contentString.includes(keyword)
      );

      if (isRelevant || queryKeywords.length === 0) {
        relevantDocs.push({
          id: doc.id,
          ...data
        });
      }
    });

    if (relevantDocs.length > 0) {
      knowledgeContext = relevantDocs
        .map(
          (doc, index) =>
            `Source Document [${index + 1}]:\n${JSON.stringify(doc)}`
        )
        .join('\n\n');
    } else {
      knowledgeContext =
        "No specific reference found in the verified product dataset.";
    }

    // ==========================================
    // STEP 4: Gemini System Instructions
    // ==========================================
const systemInstruction = `
You are Conscia's dedicated AI assistant.

You have access to THREE different types of information:

1. VERIFIED PRODUCT DATASET
2. THE AUTHENTICATED USER'S PERSONAL PROFILE
3. THE AUTHENTICATED USER'S OWN REVIEW HISTORY

IMPORTANT PRIVACY RULE:
The user profile and review history below belong ONLY to the currently
authenticated user. Never expose data belonging to another user.

========================================
GENERAL RULES
========================================

1. Greetings & Chit-chat:
Respond naturally, politely, and conversationally.

2. General Product Questions:
For general questions about products, product scores, categories,
sentiment, reviews, or product information, use ONLY the
VERIFIED PRODUCT DATASET provided below.

3. User-Specific Questions:
When the user asks about themselves, their account, their reviews,
their review history, or products they personally reviewed, use ONLY
the CURRENT USER'S PERSONAL PROFILE and CURRENT USER'S REVIEW HISTORY.

Examples:
- "What is my name?"
- "What email did I use?"
- "What were my last 2 reviews?"
- "Which products have I reviewed?"
- "What was my latest review?"
- "What did I review?"
- "Show my reviews."
- "How many reviews have I given?"

4. USER REVIEW QUESTIONS:

When the user asks about THEIR OWN reviews, review history,
or products THEY personally reviewed, use ONLY the
CURRENT USER'S REVIEW HISTORY.

CRITICAL RULES:

- NEVER use the VERIFIED PRODUCT DATASET to determine which
  products the user has personally reviewed.
- NEVER assume that a product in the VERIFIED PRODUCT DATASET
  was reviewed by the current user.
- ONLY mention products that actually appear in the
  CURRENT USER'S REVIEW HISTORY.
- If the user has reviewed only one product, mention only that product.
- NEVER invent, infer, or guess additional user reviews.
- NEVER confuse general product data with the user's personal reviews.

When discussing a user's review:
ALWAYS include:
- Product Name
- The user's actual Review Text

When the user asks:
"What products have I reviewed?"

Return ONLY the product names found in the
CURRENT USER'S REVIEW HISTORY.

When the user asks:
"What were my last 2 reviews?"

Return the two most recent reviews based on the review date,
and include both the product name and the actual review text.

5. Dates:
Use the review date when available.

When discussing "latest", "last", "recent", or similar requests,
use the createdAt date from the user's review history.

6. Missing User Data:
If the requested information does not exist in the current user's data,
say that you could not find it.

7. Missing Product Data:
If the user asks for product information that is not present
in the VERIFIED PRODUCT DATASET, reply EXACTLY with:

"I'm sorry, but I couldn't find that information in our verified product dataset."

8. Never invent:
Never invent or guess:
- Products
- User reviews
- Product scores
- Prices
- Categories
- Sentiment values
- User profile information
- Dates
- Company claims
- Certifications
- Ethical claims

9. No Outside Knowledge:
Do not use outside internet knowledge for product information.
Use only the VERIFIED PRODUCT DATASET.

10. Maintain Context:
Use the user's current message together with the available
authenticated user context and verified product context.

11. Clear and concise:
Keep responses helpful, factual, concise, and easy to understand.

Formatting Rules:
- Respond using plain text only.
- NEVER use Markdown.
- NEVER use asterisks (*) anywhere in the response.
- NEVER use double asterisks (**).
- NEVER use bold or italic formatting.
- When listing multiple items, put each item on a separate line.
- Every list item MUST begin with "- ".
- Do not put list items on the same line as each other.
- Example:

You have reviewed the following products:

- Beauty Right 1064
- Beauty Clear 1184
- Beauty Available 306

========================================
CURRENT USER PROFILE
========================================

${userContext}

========================================
CURRENT USER'S REVIEW HISTORY
========================================

${userReviewContext}

========================================
VERIFIED PRODUCT DATASET
========================================

${knowledgeContext}
`;

    // ==========================================
    // STEP 5: Initialize Gemini
    // ==========================================
    if (!process.env.GEMINI_API_KEY) {
      console.error("❌ GEMINI_API_KEY is missing.");

      return res.status(200).json({
        reply:
          "Our assistant is currently unavailable. Please try again in a moment!"
      });
    }

    const genAI = new GoogleGenerativeAI(
      process.env.GEMINI_API_KEY
    );

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction
    });

    // ==========================================
    // STEP 6: Generate Response With Retries
    // ==========================================
    let responseText = "";
    const MAX_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(
          `🤖 Gemini request attempt ${attempt}/${MAX_RETRIES}`
        );

        const result = await model.generateContent({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: message
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1
          }
        });

        responseText = result.response.text();

        console.log("✅ Gemini response generated successfully.");

        break;

      } catch (apiError) {
        console.error(
          `⚠️ Gemini API attempt ${attempt}/${MAX_RETRIES} failed:`,
          {
            status: apiError.status,
            statusText: apiError.statusText,
            message: apiError.message
          }
        );

        const retryable =
          apiError.status === 503 ||
          apiError.status === 429 ||
          apiError.status === 500;

        if (!retryable || attempt === MAX_RETRIES) {
          console.error(
            "❌ Gemini request failed after all retry attempts."
          );

          return res.status(200).json({
            reply:
              "Our assistant is currently experiencing high demand. Please wait a few moments and try again!"
          });
        }

        const delay = Math.pow(2, attempt) * 1000;

        console.log(
          `⏳ Retrying Gemini in ${delay / 1000} seconds...`
        );

        await new Promise(resolve =>
          setTimeout(resolve, delay)
        );
      }
    }

    // ==========================================
    // STEP 7: Send Response
    // ==========================================
    return res.status(200).json({
      reply:
        responseText ||
        "I'm sorry, I cannot process that request."
    });

  } catch (error) {
    console.error("❌ Chatbot system error:", error);

    return res.status(200).json({
      reply:
        "Our assistant is currently unavailable. Please try again in a moment!"
    });
  }
});