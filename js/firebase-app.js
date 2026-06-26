// js/firebase-app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Tus credenciales intactas
const firebaseConfig = {
    apiKey: "AIzaSyAfePxmpfroaov8ScWjWtiot9kSOi72POQ",
    authDomain: "calidad-agua-iot.firebaseapp.com",
    databaseURL: "https://calidad-agua-iot-default-rtdb.firebaseio.com",
    projectId: "calidad-agua-iot",
    storageBucket: "calidad-agua-iot.firebasestorage.app",
    messagingSenderId: "534165065918",
    appId: "1:534165065918:web:acf9daf6adc42844c10eef"
};

// Inicializamos la app y la base de datos
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Exportamos lo necesario para el main.js
export { database, ref, onValue };