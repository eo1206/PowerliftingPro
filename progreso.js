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


const ejercicioGrafica = document.getElementById("ejercicioGrafica");
const canvasGrafica = document.getElementById("graficaMaximos");
const ctx = canvasGrafica.getContext("2d");

let registrosGlobales = [];

ejercicioGrafica.addEventListener("change", () => {
  dibujarGraficaMaximos(ejercicioGrafica.value);
});

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
registrosGlobales = [];
    snapshot.forEach((documento) => {
      const r = documento.data();
registrosGlobales.push(r);

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

    dibujarGraficaMaximos(ejercicioGrafica.value);
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

function dibujarGraficaMaximos(ejercicioBuscado) {
  const datos = registrosGlobales
    .filter(r => r.ejercicio === ejercicioBuscado && r.maxpeso)
    .sort((a, b) => {
      const fechaA = a.creado?.seconds || 0;
      const fechaB = b.creado?.seconds || 0;
      return fechaA - fechaB;
    });

  ctx.clearRect(0, 0, canvasGrafica.width, canvasGrafica.height);

  if (datos.length === 0) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "14px Arial";
    ctx.fillText("No hay datos para este ejercicio", 40, 110);
    return;
  }

  const padding = 35;
  const ancho = canvasGrafica.width - padding * 2;
  const alto = canvasGrafica.height - padding * 2;

  const valores = datos.map(d => Number(d.maxpeso));
  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);

  const rango = maximo - minimo || 1;

  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, canvasGrafica.height - padding);
  ctx.lineTo(canvasGrafica.width - padding, canvasGrafica.height - padding);
  ctx.stroke();

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "12px Arial";

  ctx.fillText(maximo.toFixed(1) + " kg", 5, padding + 5);
  ctx.fillText(minimo.toFixed(1) + " kg", 5, canvasGrafica.height - padding);

  ctx.beginPath();

  datos.forEach((d, i) => {
    const x = padding + (i * ancho) / (datos.length - 1 || 1);
    const y = canvasGrafica.height - padding - ((Number(d.maxpeso) - minimo) / rango) * alto;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.strokeStyle = "#ef4444";
  ctx.lineWidth = 3;
  ctx.stroke();

  datos.forEach((d, i) => {
    const x = padding + (i * ancho) / (datos.length - 1 || 1);
    const y = canvasGrafica.height - padding - ((Number(d.maxpeso) - minimo) / rango) * alto;

    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#ef4444";
    ctx.fill();

    const fecha = d.fecha || "";
    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px Arial";

    if (i === 0 || i === datos.length - 1) {
      ctx.fillText(fecha, x - 20, canvasGrafica.height - 10);
    }
  });
}