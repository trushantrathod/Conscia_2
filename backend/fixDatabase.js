import { db } from './config/firebase.js'; // Double check this path matches your setup

async function updateAllProducts() {
  console.log("Starting database migration...");

  try {
    // 1. Fetch all products
    const snapshot = await db.collection('products').get();
    
    if (snapshot.empty) {
      console.log('No products found in the database.');
      return;
    }

    console.log(`Found ${snapshot.size} products. Preparing to update...`);

    let batch = db.batch();
    let batchCount = 0;
    let totalUpdated = 0;

    // 2. Loop through every single document
    for (const doc of snapshot.docs) {
      const docRef = db.collection('products').doc(doc.id);
      const data = doc.data();

      // ==========================================
      // ⚠️ MAKE YOUR CHANGES HERE ⚠️
      // ==========================================
      
      // Example 1: Add a brand new field to every product
      const updates = {
        is_active: true, 
        // new_field: "some value"
      };

      // Example 2: Fix the "Groceries" trailing space issue dynamically
      // if (data.category && data.category.endsWith(' ')) {
      //   updates.category = data.category.trim(); 
      // }

      // Example 3: Convert a string to a number
      // if (typeof data.public_sentiment_score === 'string') {
      //   updates.public_sentiment_score = Number(data.public_sentiment_score);
      // }

      // ==========================================

      // Add the update instruction to our batch
      batch.update(docRef, updates);

      batchCount++;
      totalUpdated++;

      // 3. Firestore strict limit: Commit when we hit 500 operations!
      if (batchCount === 500) {
        await batch.commit();
        console.log(`Successfully updated batch of 500 documents... (${totalUpdated}/${snapshot.size})`);
        
        // Reset the batch counter and create a fresh batch for the next 500
        batch = db.batch(); 
        batchCount = 0;
      }
    }

    // 4. Commit any leftover documents (e.g., the final 34 documents if you have 2034 total)
    if (batchCount > 0) {
      await batch.commit();
      console.log(`Successfully updated final batch of ${batchCount} documents... (${totalUpdated}/${snapshot.size})`);
    }

    console.log("🎉 Migration complete! All products updated successfully.");
    process.exit(0);

  } catch (error) {
    console.error("Fatal Error during migration:", error);
    process.exit(1);
  }
}

// Run the function
updateAllProducts();