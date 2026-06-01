import express from 'express';
// Make sure this path matches exactly where your controller is
import { syncUser } from '../controllers/authController.js'; 
// We import the security guard!
import { protect } from '../middleware/authMiddleware.js'; 

const router = express.Router();

// The secure sync route we updated earlier
router.post('/sync', protect, syncUser);

// THE FIX: This line MUST be exactly like this so server.js can read it!
export default router;