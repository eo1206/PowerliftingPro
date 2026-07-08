import { auth, db } from "./firebase.js";

import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const selectorRutina = document.getElementById("selectorRutina");
const nombreRutinaActiva = document.getElementById("nombreRutinaActiva");
const estadoRutina = document.getElementById("estadoRutina");
const contenedorRutina = document.getElementById("contenedorRutina");
const historialRutina = document.getElementById("historialRutina");

let usuarioActual = null;
let rutinas = [];
let rutinaActualId = null;
let rutinaActual = null;
let ejerciciosCompletados = [];

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  usuarioActual = user;
  cargarRutinas();
  cargarHistorialRutina();
});

function cargarRutinas() {
  const consulta = query(
    collection(db, "usuarios", usuarioActual.uid, "rutina"),
    orderBy("creado", "desc")
  );

  onSnapshot(consulta, (snapshot) => {
    rutinas = [];
    selectorRutina.innerHTML = `<option value="">Selecciona una rutina</option>`;

    if (snapshot.empty) {
      selectorRutina.innerHTML = `<option value="">No tienes rutinas</option>`;
      contenedorRutina.innerHTML = `
        <h2>Ejercicios</h2>
        <p class="empty">Ve a Crear para hacer tu primera rutina.</p>
      `;
      return;
    }

    snapshot.forEach((documento) => {
      const rutina = documento.data();

      rutinas.push({
        id: documento.id,
        ...rutina
      });

      selectorRutina.innerHTML += `
        <option value="${documento.id}">
          ${rutina.nombre}
        </option>
      `;
    });
  });
}

selectorRutina.addEventListener("change", () => {
  const idSeleccionado = selectorRutina.value;

  if (!idSeleccionado) {
    rutinaActualId = null;
    rutinaActual = null;
    ejerciciosCompletados = [];

    nombreRutinaActiva.textContent = "Sin rutina";
    estadoRutina.textContent = "---";

    contenedorRutina.innerHTML = `
      <h2>Ejercicios</h2>
      <p class="empty">Selecciona una rutina para comenzar.</p>
    `;

    return;
  }

  rutinaActual = rutinas.find((r) => r.id === idSeleccionado);
  rutinaActualId = idSeleccionado;
  ejerciciosCompletados = [];

  mostrarRutina(rutinaActual);
});

function mostrarRutina(rutina) {
  nombreRutinaActiva.textContent = rutina.nombre;
  estadoRutina.textContent = rutina.estado || "activa";

  rutina.ejercicios.forEach((item, index) => {
    contenedorRutina.innerHTML += `
  <div class="routine-exercise" id="ejercicio-card-${index}">
    
    <div class="routine-top">
      <div>
        <h3>
          <span class="routine-number">${index + 1}</span>
          ${item.ejercicio}
          <span id="check-${index}" class="check"></span>
        </h3>
        <p>${item.series} series · ${item.repsObjetivo} reps objetivo</p>
      </div>
    </div>

    <div class="routine-inputs">
      <div>
        <label>Peso realizado</label>
        <input id="pesoReal-${index}" type="number" placeholder="kg">
      </div>

      <div>
        <label>Reps reales</label>
        <input id="repsReal-${index}" type="number" placeholder="reps">
      </div>

      <div>
        <label>RPE</label>
        <input id="rpeReal-${index}" type="number" placeholder="RPE">
      </div>
    </div>

    <button class="complete-routine" data-index="${index}" type="button">
      Completar
    </button>

  </div>
`;
  });

  contenedorRutina.innerHTML += `
    <button id="guardarSesionRutina" type="button">
      Guardar datos
    </button>
  `;

  document.querySelectorAll(".complete-routine").forEach((boton) => {
    boton.addEventListener("click", () => {
      const index = Number(boton.dataset.index);
      completarEjercicio(index);
    });
  });

  document.getElementById("guardarSesionRutina").addEventListener("click", guardarSesionRutina);
}

function completarEjercicio(index) {
  if (!rutinaActual || !rutinaActualId) {
    alert("Selecciona una rutina primero");
    return;
  }

  const ejercicio = rutinaActual.ejercicios[index];

  const pesoReal = Number(document.getElementById(`pesoReal-${index}`).value);
  const repsReal = Number(document.getElementById(`repsReal-${index}`).value);
  const rpeReal = Number(document.getElementById(`rpeReal-${index}`).value);

  if (!pesoReal || !repsReal) {
    alert("Agrega peso y reps realizadas");
    return;
  }

  const registro = {
    ejercicio: ejercicio.ejercicio,
    seriesObjetivo: ejercicio.series,
    repsObjetivo: ejercicio.repsObjetivo,
    pesoReal,
    repsReal,
    rpeReal
  };

  ejerciciosCompletados[index] = registro;

  document.getElementById(`check-${index}`).textContent = "✅";
  document.getElementById(`ejercicio-card-${index}`).classList.add("completed");

  alert("Ejercicio marcado como completado");
}

async function guardarSesionRutina() {
  if (!rutinaActual || !rutinaActualId) {
    alert("Selecciona una rutina primero");
    return;
  }

  const ejerciciosFiltrados = ejerciciosCompletados.filter(Boolean);

  if (ejerciciosFiltrados.length === 0) {
    alert("Completa mínimo un ejercicio antes de guardar");
    return;
  }

  try {
    await addDoc(collection(db, "usuarios", usuarioActual.uid, "registrosRutina"), {
      rutinaId: rutinaActualId,
      nombreRutina: rutinaActual.nombre,
      ejercicios: ejerciciosFiltrados,
      totalEjercicios: rutinaActual.ejercicios.length,
      ejerciciosCompletados: ejerciciosFiltrados.length,
      fecha: new Date().toLocaleDateString("es-MX"),
      creado: serverTimestamp()
    });

    alert("Datos guardados correctamente");

    ejerciciosCompletados = [];
    mostrarRutina(rutinaActual);
  } catch (error) {
    alert("No se pudieron guardar los datos");
    console.error(error);
  }
}

function cargarHistorialRutina() {
  const consulta = query(
    collection(db, "usuarios", usuarioActual.uid, "registrosRutina"),
    orderBy("creado", "desc")
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
            <h3>${r.nombreRutina}</h3>
            <p>${r.ejerciciosCompletados}/${r.totalEjercicios} ejercicios completados</p>
            <p>${r.fecha}</p>
          </div>
        </div>
      `;
    });
  });
}