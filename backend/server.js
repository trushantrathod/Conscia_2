import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

// Route Imports
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import { processChatMessage } from './controllers/chatController.js';

dotenv.config();

const app = express();

// ==========================================
// Security and Middleware
// ==========================================
app.use(helmet());

// THE DEPLOYMENT CORS FIX
// This dynamic function allows local testing, your live Netlify site, and your Chrome Extension
const allowedOrigins = [
  'http://localhost:3000', 
  'http://localhost:5173', 
  process.env.CLIENT_URL,   // Make sure to add this in Render's Environment Variables (e.g., https://your-site.netlify.app)
  process.env.FRONTEND_URL  // Fallback naming convention
  // 'chrome-extension://YOUR_EXTENSION_ID_HERE' // Uncomment and add your ID here once published to the Web Store
];

app.use(cors({
  origin: function (origin, callback) {
    // If there is no origin (like a Chrome Extension background script) OR it's in our allowed list, let it through
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`Blocked by CORS: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Crucial for Firebase auth headers
}));

app.use(express.json({ limit: '10kb' })); 
app.use(morgan('dev'));

// ==========================================
// Rate Limiting
// ==========================================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// ==========================================
// Mount Routes
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

// Basic Route for testing/Render health checks
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'API is running optimally' });
});

// The Conscia Chatbot Route
app.post('/api/chat', processChatMessage);

// ==========================================
// Global Error Handler
// ==========================================
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

// ==========================================
// Server Initialization
// ==========================================
// Render will supply its own PORT in production. We default to 5000 locally to match your frontend/extension.
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});