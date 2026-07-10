import { auth, db, authPreparado } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

/* Elementos de la interfaz */

const authScreen = document.getElementById("authScreen");
const appScreen = document.getElementById("appScreen");

const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");

const loginBox = document.getElementById("loginBox");
const registerBox = document.getElementById("registerBox");

const crearCuenta = document.getElementById("crearCuenta");
const iniciarSesion = document.getElementById("iniciarSesion");
const cerrarSesion = document.getElementById("cerrarSesion");

const nombreUsuario = document.getElementById("nombreUsuario");

const loadingScreen = document.getElementById("loadingScreen");

/*
  Ocultar ambas pantallas mientras Firebase revisa
  si existe una sesión guardada.
*/

authScreen?.classList.add("hidden");
appScreen?.classList.add("hidden");

/* Cambiar entre iniciar sesión y crear cuenta */

loginTab?.addEventListener("click", () => {
  loginBox?.classList.remove("hidden");
  registerBox?.classList.add("hidden");
});

registerTab?.addEventListener("click", () => {
  registerBox?.classList.remove("hidden");
  loginBox?.classList.add("hidden");
});

/* Crear una cuenta */

crearCuenta?.addEventListener("click", async () => {
  const nombre = document.getElementById("regNombre")?.value.trim();
  const password = document.getElementById("regPassword")?.value;
  const confirmar = document.getElementById("regConfirmar")?.value;

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

  const usuarioLimpio = nombre
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "");

  const email = `${usuarioLimpio}@powerlog.app`;

  try {
    await authPreparado;

    const credencial = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    await setDoc(doc(db, "usuarios", credencial.user.uid), {
      nombre,
      usuario: usuarioLimpio,
      email,
      creado: serverTimestamp()
    });

    alert("Cuenta creada correctamente");
  } catch (error) {
    console.error("Error al crear cuenta:", error);

    if (error.code === "auth/email-already-in-use") {
      alert("Ese usuario ya está registrado");
      return;
    }

    if (error.code === "auth/weak-password") {
      alert("La contraseña es demasiado débil");
      return;
    }

    alert(`${error.code || "Error"}: ${error.message}`);
  }
});

/* Iniciar sesión */

iniciarSesion?.addEventListener("click", async () => {
  const nombre = document.getElementById("loginNombre")?.value.trim();
  const password = document.getElementById("loginPassword")?.value;

  if (!nombre || !password) {
    alert("Completa todos los campos");
    return;
  }

  const usuarioLimpio = nombre
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "");

  const email = `${usuarioLimpio}@powerlog.app`;

  try {
    await authPreparado;

    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
  } catch (error) {
    console.error("Error al iniciar sesión:", error);

    if (
      error.code === "auth/invalid-credential" ||
      error.code === "auth/wrong-password" ||
      error.code === "auth/user-not-found"
    ) {
      alert("Usuario o contraseña incorrectos");
      return;
    }

    alert(`${error.code || "Error"}: ${error.message}`);
  }
});

/* Cerrar sesión únicamente cuando el usuario lo decida */

cerrarSesion?.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
    alert("No se pudo cerrar la sesión");
  }
});

/* Esperar a que Firebase configure la persistencia */

try {
  await authPreparado;
} catch (error) {
  console.error("No se pudo configurar la persistencia:", error);
}

/* Mostrar la pantalla correspondiente según la sesión */
try {
  await authPreparado;
} catch (error) {
  console.error("No se pudo preparar la sesión:", error);
}

onAuthStateChanged(auth, async (user) => {
  authScreen?.classList.add("hidden");
  appScreen?.classList.add("hidden");

  if (user) {
    appScreen?.classList.remove("hidden");

    if (nombreUsuario) {
      nombreUsuario.textContent = "Usuario";
    }

    try {
      const documento = await getDoc(
        doc(db, "usuarios", user.uid)
      );

      if (documento.exists() && nombreUsuario) {
        nombreUsuario.textContent =
          documento.data().nombre || "Usuario";
      }
    } catch (error) {
      console.warn("No se pudo cargar el perfil:", error);
    }
  } else {
    authScreen?.classList.remove("hidden");
  }

  loadingScreen?.classList.add("hidden");
});