import { auth, db } from "./firebase.js";

import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const nombreRutina = document.getElementById("nombreRutina");
const ejercicioRutina = document.getElementById("ejercicioRutina");
const pesoRutina = document.getElementById("pesoRutina");
const repsRutina = document.getElementById("repsRutina");

const agregarEjercicioRutina = document.getElementById("agregarEjercicioRutina");
const guardarRutina = document.getElementById("guardarRutina");
const vistaRutina = document.getElementById("vistaRutina");

let usuarioActual = null;
let ejerciciosRutina = [];

onAuthStateChanged(auth, (user) => {
  if (!user) {
    alert("Primero inicia sesión");
    return;
  }

  usuarioActual = user;
  cargarRutinas();
});

agregarEjercicioRutina.addEventListener("click", () => {
  const ejercicio = ejercicioRutina.value;
  const peso = Number(pesoRutina.value);
  const reps = Number(repsRutina.value);

  if (!ejercicio || !peso || !reps) {
    alert("Completa ejercicio, peso y reps");
    return;
  }

  ejerciciosRutina.push({
    ejercicio,
    peso,
    reps
  });

  pesoRutina.value = "";
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
          <p>${item.peso} kg · ${item.reps} reps</p>
        </div>
        <span>#${index + 1}</span>
      </div>
    `;
  });
}

guardarRutina.addEventListener("click", async () => {
  if (!usuarioActual) {
    alert("Primero inicia sesión");
    return;
  }

  if (!nombreRutina.value.trim()) {
    alert("Escribe el nombre de la rutina");
    return;
  }

  if (ejerciciosRutina.length === 0) {
    alert("Agrega mínimo un ejercicio");
    return;
  }

  await addDoc(collection(db, "usuarios", usuarioActual.uid, "rutina"), {
    nombre: nombreRutina.value.trim(),
    ejercicios: ejerciciosRutina,
    estado: "creada",
    creado: serverTimestamp()
  });

  nombreRutina.value = "";
  ejerciciosRutina = [];

  vistaRutina.innerHTML = "<h2>Rutina</h2><p>Rutina guardada correctamente.</p>";
});

function cargarRutinas() {
  const consulta = query(
    collection(db, "usuarios", usuarioActual.uid, "rutina"),
    orderBy("creado", "desc")
  );

  onSnapshot(consulta, (snapshot) => {
    vistaRutina.innerHTML = "<h2>Rutinas creadas</h2>";

    if (snapshot.empty) {
      vistaRutina.innerHTML += `<p class="empty">Todavía no hay rutinas.</p>`;
      return;
    }

    snapshot.forEach((documento) => {
      const rutina = documento.data();

      vistaRutina.innerHTML += `
        <div class="routine-card">
          <h3>${rutina.nombre}</h3>
          <p>Estado: ${rutina.estado}</p>

          ${rutina.ejercicios.map((item, index) => `
            <div class="exercise">
              <div>
                <h3>${item.ejercicio}</h3>
                <p>${item.peso} kg · ${item.reps} reps</p>
              </div>
              <span>#${index + 1}</span>
            </div>
          `).join("")}

          <button class="delete" data-id="${documento.id}" type="button">Eliminar rutina</button>
        </div>
      `;
    });

    document.querySelectorAll(".delete").forEach((boton) => {
      boton.addEventListener("click", async () => {
        await deleteDoc(
          doc(db, "usuarios", usuarioActual.uid, "rutina", boton.dataset.id)
        );
      });
    });
  });
}