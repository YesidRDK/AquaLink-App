// ================================================
// Configuración de Firebase
// Inicializa la conexión con Firebase Auth y
// Firestore para la gestión de usuarios y pedidos.
// ================================================

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Datos de conexión del proyecto en Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAxAGcIbpqgoB0SDGWDZhqxlyP_v3VOrNc",
  authDomain: "app-cisterna.firebaseapp.com",
  projectId: "app-cisterna",
  storageBucket: "app-cisterna.firebasestorage.app",
  messagingSenderId: "882756304303",
  appId: "1:882756304303:web:5e07271a17dbafb1eb035a",
  measurementId: "G-3G782V5V8R"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Servicios utilizados en la aplicación
export const auth = getAuth(app);       // Autenticación (login y registro)
export const db = getFirestore(app);    // Base de datos (pedidos, usuarios, reportes)