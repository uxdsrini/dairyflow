import { db } from './config/firebase-admin';

async function check() {
  console.log("Checking Firestore collections...");
  try {
    const collections = ['customers', 'workers', 'deliveries', 'payments'];
    for (const col of collections) {
      const snap = await db.collection(col).limit(3).get();
      console.log(`Collection '${col}' count: ${snap.size}`);
      snap.docs.forEach(doc => {
        console.log(`  Document ${doc.id}:`, JSON.stringify(doc.data()));
      });
    }
  } catch (err: any) {
    console.error("Error checking Firestore:", err);
  }
}

check();
