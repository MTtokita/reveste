import { initializeApp } from "firebase/app";
//import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore"; 
import { getAuth } from "firebase/auth"; 

const firebaseConfig = {
  apiKey: "AIzaSyBSB6aSocSgciQxKz5-tXf59feTFb0Qx9E",
  authDomain: "reveste-9b0ed.firebaseapp.com",
  projectId: "reveste-9b0ed",
  storageBucket: "reveste-9b0ed.firebasestorage.app",
  messagingSenderId: "977443481669",
  appId: "1:977443481669:web:66df9a050fdee57e95db2c",
  measurementId: "G-Z90P6D03M3"
};

// Inicializa o aplicativo Firebase
const app = initializeApp(firebaseConfig);
//const analytics = getAnalytics(app);

// Exportações essenciais que o seu projeto usa:
export const db = getFirestore(app); 
export const auth = getAuth(app);    