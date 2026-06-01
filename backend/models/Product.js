import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    product_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    product_name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    product_price: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    reviews: {
      type: String, // Storing concatenated reviews separated by '|' as per your ML pipeline
      default: '',
    },
    environmental_impact: {
      type: Number,
      default: 50,
    },
    labor_rights: {
      type: Number,
      default: 50,
    },
    animal_welfare: {
      type: Number,
      default: 50,
    },
    corporate_governance: {
      type: Number,
      default: 50,
    },
    public_sentiment_score: {
      type: Number,
      default: 50,
      index: true, // Indexed for sorting by best/worst products quickly
    },
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.model('Product', productSchema);
export default Product;