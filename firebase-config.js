// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAgx-uW8j5177r6buIFAj7jYuH2e4xfU5c",
  authDomain: "motivationapp-c88f8.firebaseapp.com",
  projectId: "motivationapp-c88f8",
  storageBucket: "motivationapp-c88f8.firebasestorage.app",
  messagingSenderId: "1060765924590",
  appId: "1:1060765924590:web:12d2288b79d3264bb8c7ff",
  measurementId: "G-XD5HFG21NJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
