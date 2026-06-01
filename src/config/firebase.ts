import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAf3Cd8nqlktVdu5z_G71bbUbqJeY95Lh4",
  authDomain: "dairyflow-fc50f.firebaseapp.com",
  projectId: "dairyflow-fc50f",
  storageBucket: "dairyflow-fc50f.firebasestorage.app",
  messagingSenderId: "907732953089",
  appId: "1:907732953089:web:74ca1ccdfee058214cb800"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
