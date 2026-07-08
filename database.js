import { auth, db } from "./firebase.js";

import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

function uid() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("No hay usuario iniciado");
  }

  return user.uid;
}

// REGISTROS

export async function guardarRegistro(datos) {
  return await addDoc(collection(db, "usuarios", uid(), "registros"), {
    ...datos,
    creado: serverTimestamp()
  });
}

export async function leerRegistros() {
  const q = query(
    collection(db, "usuarios", uid(), "registros"),
    orderBy("creado", "desc")
  );

  return await getDocs(q);
}

export async function borrarRegistro(id) {
  return await deleteDoc(doc(db, "usuarios", uid(), "registros", id));
}

// RUTINAS

export async function guardarRutina(datos) {
  return await addDoc(collection(db, "usuarios", uid(), "rutinas"), {
    ...datos,
    creado: serverTimestamp()
  });
}

export async function leerRutinas() {
  return await getDocs(collection(db, "usuarios", uid(), "rutinas"));
}

export async function leerRutina(id) {
  return await getDoc(doc(db, "usuarios", uid(), "rutinas", id));
}

export async function actualizarRutina(id, datos) {
  return await updateDoc(doc(db, "usuarios", uid(), "rutinas", id), datos);
}

export async function borrarRutina(id) {
  return await deleteDoc(doc(db, "usuarios", uid(), "rutinas", id));
}

// PERFIL

export async function guardarPerfil(datos) {
  return await setDoc(doc(db, "usuarios", uid()), datos, { merge: true });
}

export async function leerPerfil() {
  return await getDoc(doc(db, "usuarios", uid()));
}

export async function actualizarPerfil(datos) {
  return await updateDoc(doc(db, "usuarios", uid()), datos);
}