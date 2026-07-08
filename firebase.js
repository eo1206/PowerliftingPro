import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBx24wcMkvOejUCfhBGJ8Ybc11ISm2DNTg",
    authDomain: "powerlog-6cf05.firebaseapp.com",
    projectId: "powerlog-6cf05",
    storageBucket: "powerlog-6cf05.firebasestorage.app",
    messagingSenderId: "1020175212667",
    appId: "1:1020175212667:web:c0a9b319fa0aa89babc2de",
    measurementId: "G-PJVVCMBJK0"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);