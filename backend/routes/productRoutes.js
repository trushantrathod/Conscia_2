import express from 'express';

import {
  getProducts,
  getProductById,
  addProductReview,
  getMyReviews,
  searchProducts,
  getEthicalSnapshot
} from '../controllers/productController.js';

import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').get(protect, getProducts);
router.route('/my-reviews').get(protect, getMyReviews);

router.route('/search').get(protect, searchProducts);

router.route('/:id/ethical-snapshot').get(protect, getEthicalSnapshot);

router.route('/:id').get(protect, getProductById);
router.route('/:id/reviews').post(protect, addProductReview);

export default router;