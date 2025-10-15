// config/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

// Surf Sense Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBfoLnlEbw6x8shPKXy-2MjfQIy-sSGlRk",
  authDomain: "surf-sense-ce42c.firebaseapp.com",
  projectId: "surf-sense-ce42c",
  storageBucket: "surf-sense-ce42c.appspot.com", // check if works, new domain, changed from surf-sense
  messagingSenderId: "362073622596",
  appId: "1:362073622596:web:7f3e9f2f6e59e7c0bf9411",
  measurementId: "G-26MTC3D6JQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);

// Web compatibility and reCAPTCHA configuration
if (Platform.OS === 'web') {
  console.log('Firebase initialized for web with reCAPTCHA support');
}

export default app;
