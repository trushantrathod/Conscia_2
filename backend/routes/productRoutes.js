import express from 'express';
// 1. Ensure searchProducts is imported here!
import { getProducts, getProductById, addProductReview, getMyReviews, searchProducts } from '../controllers/productController.js'; 
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').get(protect, getProducts);
router.route('/my-reviews').get(protect, getMyReviews);

// 2. NEW GLOBAL SEARCH ROUTE (Must be above /:id)
router.route('/search').get(protect, searchProducts); 

router.route('/:id').get(protect, getProductById);
router.route('/:id/reviews').post(protect, addProductReview);

export default router;