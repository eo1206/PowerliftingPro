import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
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
export const auth = initializeAuth(app, {
  persistence: [
    indexedDBLocalPersistence,
    browserLocalPersistence
  ]
});

export const authPreparado = auth.authStateReady();

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});