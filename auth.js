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

const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");

const loginBox = document.getElementById("loginBox");
const registerBox = document.getElementById("registerBox");

const crearCuenta = document.getElementById("crearCuenta");
const iniciarSesion = document.getElementById("iniciarSesion");
const cerrarSesion = document.getElementById("cerrarSesion");

// Cambiar pestañas
loginTab.addEventListener("click", () => {
  loginBox.classList.remove("hidden");
  registerBox.classList.add("hidden");
});

registerTab.addEventListener("click", () => {
  registerBox.classList.remove("hidden");
  loginBox.classList.add("hidden");
});

// Crear cuenta
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

  if (password.length < 6) {
    alert("La contraseña debe tener mínimo 6 caracteres");
    return;
  }

  const usuarioLimpio = nombre.toLowerCase().replace(/\s+/g, "");
  const email = usuarioLimpio + "@powerlog.app";

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "usuarios", userCredential.user.uid), {
      nombre: nombre,
      usuario: usuarioLimpio,
      email: email,
      creado: new Date()
    });

    alert("Cuenta creada correctamente");
  } catch (error) {
    alert(error.code);
    console.error(error);
  }
});

// Iniciar sesión
iniciarSesion.addEventListener("click", async () => {
  const nombre = document.getElementById("loginNombre").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!nombre || !password) {
    alert("Completa todos los campos");
    return;
  }

  const usuarioLimpio = nombre.toLowerCase().replace(/\s+/g, "");
  const email = usuarioLimpio + "@powerlog.app";

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    alert(error.code);
    console.error(error);
  }
});

// Cerrar sesión
cerrarSesion.addEventListener("click", async () => {
  await signOut(auth);
});

// Detectar sesión
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

onAuthStateChanged(auth, async (user) => {
  if (user) {
    authScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");

    try {
      const documento = await getDoc(
        doc(db, "usuarios", user.uid)
      );

      if (documento.exists()) {
        nombreUsuario.textContent = documento.data().nombre;
      }
    } catch (error) {
      console.warn("No se pudo consultar el perfil:", error);
    }
  } else {
    authScreen.classList.remove("hidden");
    appScreen.classList.add("hidden");
  }
});