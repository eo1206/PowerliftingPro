import { auth, db } from "./firebase.js";

import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const nombreRutinaActiva = document.getElementById("nombreRutinaActiva");
const estadoRutina = document.getElementById("estadoRutina");
const contenedorRutina = document.getElementById("contenedorRutina");
const historialRutina = document.getElementById("historialRutina");

let usuarioActual = null;
let rutinaActualId = null;
let rutinaActual = null;

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  usuarioActual = user;
  cargarUltimaRutina();
  cargarHistorialRutina();
});

function cargarUltimaRutina() {
  const consulta = query(
    collection(db, "usuarios", usuarioActual.uid, "rutina"),
    orderBy("creado", "desc"),
    limit(1)
  );

  onSnapshot(consulta, (snapshot) => {
    if (snapshot.empty) {
      nombreRutinaActiva.textContent = "Sin rutina";
      estadoRutina.textContent = "---";
      contenedorRutina.innerHTML = `
        <h2>Ejercicios</h2>
        <p class="empty">No tienes rutinas creadas. Ve a Crear para hacer una.</p>
      `;
      return;
    }

    const documento = snapshot.docs[0];

    rutinaActualId = documento.id;
    rutinaActual = documento.data();

    nombreRutinaActiva.textContent = rutinaActual.nombre;
    estadoRutina.textContent = rutinaActual.estado;

    mostrarRutina(rutinaActual);
  });
}

function mostrarRutina(rutina) {
  contenedorRutina.innerHTML = `<h2>${rutina.nombre}</h2>`;

  rutina.ejercicios.forEach((item, index) => {
    contenedorRutina.innerHTML += `
      <div class="exercise rutina-item">
        <div>
          <h3>${item.ejercicio}</h3>
          <p>${item.series} series · ${item.repsObjetivo} reps objetivo</p>

          <div class="grid">
            <input id="pesoReal-${index}" type="number" placeholder="Peso realizado">
            <input id="repsReal-${index}" type="number" placeholder="Reps reales">
          </div>

          <input id="rpeReal-${index}" type="number" placeholder="RPE">
        </div>

        <button class="complete-routine" data-index="${index}" type="button">
          Completar
        </button>
      </div>
    `;
  });

  document.querySelectorAll(".complete-routine").forEach((boton) => {
    boton.addEventListener("click", async () => {
      const index = Number(boton.dataset.index);
      await completarEjercicio(index);
    });
  });
}

async function completarEjercicio(index) {
  const ejercicio = rutinaActual.ejercicios[index];

  const pesoReal = Number(document.getElementById(`pesoReal-${index}`).value);
  const repsReal = Number(document.getElementById(`repsReal-${index}`).value);
  const rpeReal = Number(document.getElementById(`rpeReal-${index}`).value);

  if (!pesoReal || !repsReal) {
    alert("Agrega peso y reps realizadas");
    return;
  }

  await addDoc(collection(db, "usuarios", usuarioActual.uid, "registrosRutina"), {
    rutinaId: rutinaActualId,
    nombreRutina: rutinaActual.nombre,
    ejercicio: ejercicio.ejercicio,
    seriesObjetivo: ejercicio.series,
    repsObjetivo: ejercicio.repsObjetivo,
    pesoReal,
    repsReal,
    rpeReal,
    fecha: new Date().toLocaleDateString("es-MX"),
    creado: serverTimestamp()
  });

  alert("Ejercicio registrado");
}

function cargarHistorialRutina() {
  const consulta = query(
    collection(db, "usuarios", usuarioActual.uid, "registrosRutina"),
    orderBy("creado", "desc"),
    limit(10)
  );

  onSnapshot(consulta, (snapshot) => {
    historialRutina.innerHTML = "<h2>Registros de rutina</h2>";

    if (snapshot.empty) {
      historialRutina.innerHTML += `<p class="empty">Todavía no hay registros.</p>`;
      return;
    }

    snapshot.forEach((documento) => {
      const r = documento.data();

      historialRutina.innerHTML += `
        <div class="exercise">
          <div>
            <h3>${r.ejercicio}</h3>
            <p>${r.pesoReal} kg · ${r.repsReal} reps · RPE ${r.rpeReal || "-"}</p>
            <p>Rutina: ${r.nombreRutina}</p>
            <p>${r.fecha}</p>
          </div>
        </div>
      `;
    });
  });
}