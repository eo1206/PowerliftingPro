import { auth, db, authPreparado } from "./firebase.js";

import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const nombreRutina = document.getElementById("nombreRutina");
const ejercicioRutina = document.getElementById("ejercicioRutina");
const seriesRutina = document.getElementById("seriesRutina");
const repsRutina = document.getElementById("repsRutina");

const agregarEjercicioRutina = document.getElementById("agregarEjercicioRutina");
const guardarRutina = document.getElementById("guardarRutina");
const vistaRutina = document.getElementById("vistaRutina");

let usuarioActual = null;
let ejerciciosRutina = [];


try {
  await authPreparado;
} catch (error) {
  console.error("No se pudo restaurar la sesión:", error);
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.replace("index.html");
    return;
  }

  usuarioActual = user;
});

agregarEjercicioRutina.addEventListener("click", () => {
  const ejercicio = ejercicioRutina.value;
  const series = Number(seriesRutina.value);
  const repsObjetivo = Number(repsRutina.value);

  if (!ejercicio || !series || !repsObjetivo) {
    alert("Completa ejercicio, series y reps");
    return;
  }

  ejerciciosRutina.push({
    ejercicio,
    series,
    repsObjetivo
  });

  seriesRutina.value = "";
  repsRutina.value = "";

  mostrarVistaPrevia();
});

function mostrarVistaPrevia() {
  vistaRutina.innerHTML = "<h2>Vista previa</h2>";

  ejerciciosRutina.forEach((item, index) => {
    vistaRutina.innerHTML += `
      <div class="exercise">
        <div>
          <h3>${item.ejercicio}</h3>
          <p>${item.series} series · ${item.repsObjetivo} reps objetivo</p>
        </div>
        <button class="delete temp-delete" data-index="${index}" type="button">×</button>
      </div>
    `;
  });

  document.querySelectorAll(".temp-delete").forEach((boton) => {
    boton.addEventListener("click", () => {
      const index = Number(boton.dataset.index);
      ejerciciosRutina.splice(index, 1);
      mostrarVistaPrevia();
    });
  });
}

guardarRutina.addEventListener("click", async () => {
  if (!usuarioActual) {
    alert("Primero inicia sesión");
    return;
  }

  const nombre = nombreRutina.value.trim();

  if (!nombre) {
    alert("Escribe el nombre de la rutina");
    return;
  }

  if (ejerciciosRutina.length === 0) {
    alert("Agrega mínimo un ejercicio");
    return;
  }

  try {
    await addDoc(collection(db, "usuarios", usuarioActual.uid, "rutina"), {
      nombre,
      estado: "activa",
      ejercicios: ejerciciosRutina,
      creado: serverTimestamp()
    });

    alert("Rutina guardada");

    nombreRutina.value = "";
    ejerciciosRutina = [];

    vistaRutina.innerHTML = `
      <h2>Vista previa</h2>
      <p class="empty">Agrega ejercicios para crear tu rutina.</p>
    `;
  } catch (error) {
    alert("No se pudo guardar la rutina");
    console.error(error);
  }
});