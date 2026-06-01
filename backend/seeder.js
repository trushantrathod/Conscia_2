import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import csv from 'csv-parser';
import admin, { db } from './config/firebase.js';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CSV_FILE_PATH = path.join(__dirname, 'data', 'products_with_scores.csv');

const parseScore = (val) => {
  const parsed = parseFloat(val);
  return isNaN(parsed) ? 50 : parsed;
};

const importData = async () => {
  console.log('🔄 Connected to Firestore. Preparing to seed...');
  const productsToInsert = [];

  fs.createReadStream(CSV_FILE_PATH)
    .pipe(csv())
    .on('data', (row) => {
      productsToInsert.push({
        product_id: row['product_id'],
        product_name: row['product_name'],
        product_price: parseFloat(row['product_price']) || 0,
        category: row['category'],
        reviews: row['reviews'] || '',
        environmental_impact: parseScore(row['environmental impact']),
        labor_rights: parseScore(row['labor rights']),
        animal_welfare: parseScore(row['animal welfare']),
        corporate_governance: parseScore(row['corporate governance']),
        public_sentiment_score: parseScore(row['public_sentiment_score']),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    })
    .on('end', async () => {
      console.log(`📦 Parsed ${productsToInsert.length} products. Starting batch upload...`);
      
      // Firestore allows a maximum of 500 writes per batch. We use 450 to be safe.
      const BATCH_SIZE = 450; 
      let batches = [];
      
      for (let i = 0; i < productsToInsert.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const chunk = productsToInsert.slice(i, i + BATCH_SIZE);
        
        chunk.forEach((product) => {
          // Use product_id as the exact document ID for extremely fast O(1) lookups later
          const docRef = db.collection('products').doc(product.product_id);
          batch.set(docRef, product);
        });
        
        batches.push(batch.commit());
        console.log(`⏳ Prepared batch ${Math.floor(i / BATCH_SIZE) + 1}...`);
      }

      try {
        await Promise.all(batches);
        console.log('✅ All products successfully imported into Firestore!');
        process.exit(0);
      } catch (err) {
        console.error('❌ Error committing batches to Firestore:', err);
        process.exit(1);
      }
    });
};

importData();