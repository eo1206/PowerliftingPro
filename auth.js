import { auth, db, authPreparado } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const loadingScreen = document.getElementById("loadingScreen");
const authScreen = document.getElementById("authScreen");
const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");
const loginBox = document.getElementById("loginBox");
const registerBox = document.getElementById("registerBox");

function usuarioAEmail(nombre) {
  return `${nombre.toLowerCase().trim().replace(/\s+/g, "")}@powerlog.app`;
}

function cambiarPestana(mostrarRegistro) {
  loginBox.classList.toggle("hidden", mostrarRegistro);
  registerBox.classList.toggle("hidden", !mostrarRegistro);
  loginTab.classList.toggle("tab-active", !mostrarRegistro);
  registerTab.classList.toggle("tab-active", mostrarRegistro);
}

loginTab.addEventListener("click", () => cambiarPestana(false));
registerTab.addEventListener("click", () => cambiarPestana(true));

loginBox.addEventListener("submit", async (event) => {
  event.preventDefault();
  const nombre = document.getElementById("loginNombre").value.trim();
  const password = document.getElementById("loginPassword").value;
  if (!nombre || !password) return alert("Completa usuario y contraseña");

  try {
    await authPreparado;
    await signInWithEmailAndPassword(auth, usuarioAEmail(nombre), password);
    window.location.replace("inicio.html");
  } catch (error) {
    console.error(error);
    if (["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found"].includes(error.code)) {
      alert("Usuario o contraseña incorrectos");
    } else if (!navigator.onLine) {
      alert("No hay conexión. Para iniciar una sesión nueva necesitas internet.");
    } else {
      alert("No se pudo iniciar sesión");
    }
  }
});

registerBox.addEventListener("submit", async (event) => {
  event.preventDefault();
  const nombre = document.getElementById("regNombre").value.trim();
  const password = document.getElementById("regPassword").value;
  const confirmar = document.getElementById("regConfirmar").value;

  if (!nombre || !password || !confirmar) return alert("Completa todos los campos");
  if (password !== confirmar) return alert("Las contraseñas no coinciden");
  if (password.length < 6) return alert("La contraseña debe tener mínimo 6 caracteres");

  try {
    await authPreparado;
    const credencial = await createUserWithEmailAndPassword(auth, usuarioAEmail(nombre), password);
    await setDoc(doc(db, "usuarios", credencial.user.uid), {
      nombre,
      usuario: nombre.toLowerCase().trim().replace(/\s+/g, ""),
      email: usuarioAEmail(nombre),
      creado: serverTimestamp()
    });
    window.location.replace("inicio.html");
  } catch (error) {
    console.error(error);
    if (error.code === "auth/email-already-in-use") alert("Ese usuario ya está registrado");
    else if (!navigator.onLine) alert("Necesitas conexión para crear una cuenta");
    else alert("No se pudo crear la cuenta");
  }
});

try {
  await authPreparado;
  onAuthStateChanged(auth, (user) => {
    if (user) window.location.replace("inicio.html");
    else {
      loadingScreen.classList.add("hidden");
      authScreen.classList.remove("hidden");
    }
  });
} catch (error) {
  console.error(error);
  loadingScreen.classList.add("hidden");
  authScreen.classList.remove("hidden");
}
