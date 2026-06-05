import dotenv from 'dotenv';
import * as admin from 'firebase-admin';

dotenv.config();

const projectId = process.env.FIREBASE_PROJECT_ID || 'dairyflow-fc50f';
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

const credential =
  clientEmail && privateKey
    ? admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      })
    : undefined;

try {
  admin.initializeApp({
    projectId,
    ...(credential ? { credential } : {}),
  });
} catch (e) {
  console.log('Firebase Admin already initialized or config error:', e);
}

export const db = admin.firestore();
export default admin;
