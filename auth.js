import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const authScreen = document.getElementById("authScreen");
const appScreen = document.getElementById("appScreen");

const crearCuenta = document.getElementById("crearCuenta");
const iniciarSesion = document.getElementById("iniciarSesion");
const cerrarSesion = document.getElementById("cerrarSesion");

crearCuenta.addEventListener("click", async () => {
  const nombre = document.getElementById("regNombre").value.trim();
  const password = document.getElementById("regPassword").value;
  const confirmar = document.getElementById("regConfirmar").value;

  if (!nombre || !password || !confirmar) {
    alert("Completa todos los campos");
    return;
  }

  if (password !== confirmar) {
    alert("Las contraseñas no coinciden");
    return;
  }

  const email = nombre.toLowerCase() + "@powerlog.app";

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "usuarios", userCredential.user.uid), {
      nombre: nombre,
      email: email,
      creado: new Date()
    });

    alert("Cuenta creada");
  } catch (error) {
    alert(error.message);
    console.error(error);
  }
});

iniciarSesion.addEventListener("click", async () => {
  const nombre = document.getElementById("loginNombre").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!nombre || !password) {
    alert("Completa todos los campos");
    return;
  }

  const email = nombre.toLowerCase() + "@powerlog.app";

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    alert("No se pudo iniciar sesión");
    console.error(error);
  }
});

cerrarSesion.addEventListener("click", async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, async (user) => {
  if (user) {
    authScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");

    const documento = await getDoc(doc(db, "usuarios", user.uid));

    if (documento.exists()) {
      document.getElementById("nombreUsuario").textContent = documento.data().nombre;
    }
  } else {
    authScreen.classList.remove("hidden");
    appScreen.classList.add("hidden");
  }
});