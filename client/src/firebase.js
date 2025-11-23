// src/firebase.js
import { initializeApp } from "firebase/app";
// Optionally import other services if needed later
// import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDymxIBLtZen8BymXTfSmqgP6ddPr5Uwg4",
  authDomain: "business-management-syst-f2716.firebaseapp.com",
  projectId: "business-management-syst-f2716",
  storageBucket: "business-management-syst-f2716.firebasestorage.app",
  messagingSenderId: "88216835304",
  appId: "1:88216835304:web:2a3d7bc6bf25d2473ee55d",
  measurementId: "G-BDQH45DGW2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the app instance if needed elsewhere
export default app;

// Example: Initialize Analytics (only if needed and on the client side)
// const analytics = getAnalytics(app);
// export { analytics };