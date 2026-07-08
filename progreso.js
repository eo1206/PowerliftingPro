import { auth, db } from "./firebase.js";

import {
  collection,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const prSentadilla = document.getElementById("prSentadilla");
const prBanca = document.getElementById("prBanca");
const prMuerto = document.getElementById("prMuerto");

const totalEntrenamientos = document.getElementById("totalEntrenamientos");
const volumenTotal = document.getElementById("volumenTotal");

const volSentadilla = document.getElementById("volSentadilla");
const volBanca = document.getElementById("volBanca");
const volMuerto = document.getElementById("volMuerto");

const ultimosRegistros = document.getElementById("ultimosRegistros");

let usuarioActual = null;

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  usuarioActual = user;
  cargarProgreso();
});

function cargarProgreso() {
  const consulta = query(
    collection(db, "usuarios", usuarioActual.uid, "registros"),
    orderBy("creado", "desc")
  );

  onSnapshot(consulta, (snapshot) => {
    let mejorSentadilla = 0;
    let mejorBanca = 0;
    let mejorMuerto = 0;

    let volumenGeneral = 0;
    let volumenSentadilla = 0;
    let volumenBanca = 0;
    let volumenMuerto = 0;

    let cantidadRegistros = 0;

    ultimosRegistros.innerHTML = "<h2>Últimos registros</h2>";

    if (snapshot.empty) {
      limpiarValores();
      ultimosRegistros.innerHTML += `<p class="empty">Todavía no hay registros.</p>`;
      return;
    }

    snapshot.forEach((documento) => {
      const r = documento.data();

      cantidadRegistros++;

      const volumen = Number(r.volumen) || 0;
      const maxpeso = Number(r.maxpeso) || 0;

      volumenGeneral += volumen;

      if (r.ejercicio === "Sentadilla") {
        volumenSentadilla += volumen;
        if (maxpeso > mejorSentadilla) mejorSentadilla = maxpeso;
      }

      if (r.ejercicio === "Press banca") {
        volumenBanca += volumen;
        if (maxpeso > mejorBanca) mejorBanca = maxpeso;
      }

      if (r.ejercicio === "Peso muerto") {
        volumenMuerto += volumen;
        if (maxpeso > mejorMuerto) mejorMuerto = maxpeso;
      }

      if (cantidadRegistros <= 8) {
        ultimosRegistros.innerHTML += `
          <div class="exercise">
            <div>
              <h3>${r.ejercicio}</h3>
              <p>${r.series} series · ${r.reps} reps · ${r.peso} kg</p>
              <p>1RM estimado: ${maxpeso.toFixed(1)} kg</p>
              <p>Volumen: ${volumen.toFixed(1)} kg · ${r.fecha || ""}</p>
            </div>
          </div>
        `;
      }
    });

    prSentadilla.textContent = mejorSentadilla.toFixed(1);
    prBanca.textContent = mejorBanca.toFixed(1);
    prMuerto.textContent = mejorMuerto.toFixed(1);

    totalEntrenamientos.textContent = `${cantidadRegistros} registros`;
    volumenTotal.textContent = `${volumenGeneral.toFixed(1)} kg`;

    volSentadilla.textContent = `${volumenSentadilla.toFixed(1)} kg`;
    volBanca.textContent = `${volumenBanca.toFixed(1)} kg`;
    volMuerto.textContent = `${volumenMuerto.toFixed(1)} kg`;
  });
}

function limpiarValores() {
  prSentadilla.textContent = "0";
  prBanca.textContent = "0";
  prMuerto.textContent = "0";

  totalEntrenamientos.textContent = "0 registros";
  volumenTotal.textContent = "0 kg";

  volSentadilla.textContent = "0 kg";
  volBanca.textContent = "0 kg";
  volMuerto.textContent = "0 kg";
}