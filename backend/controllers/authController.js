import { admin, db } from '../config/firebase.js';
import asyncHandler from '../utils/asyncHandler.js';

// @desc    Sync Firebase user with Firestore database
// @route   POST /api/auth/sync
// @access  Private
// Inside your authController.js sync function:
export const syncUser = asyncHandler(async (req, res) => {
  const { uid, email, displayName } = req.user; // Assuming you extract this from the token

  try {
    const userRef = db.collection('users').doc(uid);
    const doc = await userRef.get();

    if (!doc.exists) {
      await userRef.set({
        email,
        displayName: displayName || email.split('@')[0],
        createdAt: new Date(),
        role: 'user'
      });
    }
    res.status(200).json({ message: 'User synced successfully' });
    
  } catch (error) {
    if (error.code === 8) { // Error 8 is Quota Exceeded
      console.warn("⚠️ Quota Exceeded on Auth Sync. Bypassing to allow login.");
      // Just return success so the frontend lets you into the dashboard!
      return res.status(200).json({ message: 'Bypassed sync due to quota limit' }); 
    }
    res.status(500).json({ message: 'Server error during sync' });
  }
});