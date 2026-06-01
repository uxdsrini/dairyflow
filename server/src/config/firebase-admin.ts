import * as admin from 'firebase-admin';

// Initialize firebase admin using projectId
// In local environments without service account key, this will use application default credentials or fall back.
try {
  admin.initializeApp({
    projectId: 'dairyflow-fc50f'
  });
} catch (e) {
  console.log('Firebase Admin already initialized or config error:', e);
}

export const db = admin.firestore();
export default admin;
