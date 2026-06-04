// firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAxAGcIbpqgoB0SDGWDZhqxlyP_v3VOrNc",
  authDomain: "app-cisterna.firebaseapp.com",
  projectId: "app-cisterna",
  storageBucket: "app-cisterna.firebasestorage.app",
  messagingSenderId: "882756304303",
  appId: "1:882756304303:web:5e07271a17dbafb1eb035a",
  measurementId: "G-3G782V5V8R"
};

// Inicializamos la conexión con la nube
const app = initializeApp(firebaseConfig);

// Exportamos las herramientas que vamos a usar en nuestras pantallas
export const auth = getAuth(app);      // Para el Login y Registro
export const db = getFirestore(app);   // Para guardar los pedidos de agua