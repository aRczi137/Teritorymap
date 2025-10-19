// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDC49cyQIw2wlw_seFST6FSNDR2bFD0oEI",
  authDomain: "teritory-map-s49.firebaseapp.com",
  projectId: "teritory-map-s49",
  storageBucket: "teritory-map-s49.firebasestorage.app",
  messagingSenderId: "1081870934997",
  appId: "1:1081870934997:web:8e08581f1a67de7931d35c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);