import { auth, db } from "./firebase.js";

import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const form = document.getElementById("trainingForm");
const lista = document.getElementById("listaRegistros");

let usuarioActual = null;
let cancelarEscucha = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
  usuarioActual = null;
  return;
}

  usuarioActual = user;
  cargarRegistros(user.uid);
  await actualizarPRs();
});

function calcular1RM(peso, reps) {
  const resultado = peso * 36 / (37 - reps);
  return Number(resultado.toFixed(1));
}

async function obtenerMaximoPorEjercicio(ejercicioBuscado) {
  const consulta = query(
    collection(db, "usuarios", usuarioActual.uid, "registros"),
    where("ejercicio", "==", ejercicioBuscado)
  );

  const resultados = await getDocs(consulta);

  let maximo = 0;

  resultados.forEach((documento) => {
    const datos = documento.data();
    const valor = Number(datos.maxpeso);

    if (valor > maximo) {
      maximo = valor;
    }
  });

  return maximo;
}

async function actualizarPRs() {
  const maxSentadilla = await obtenerMaximoPorEjercicio("Sentadilla");
  const maxBanca = await obtenerMaximoPorEjercicio("Press banca");
  const maxMuerto = await obtenerMaximoPorEjercicio("Peso muerto");

  document.getElementById("prSentadilla").textContent = maxSentadilla.toFixed(1);
  document.getElementById("prBanca").textContent = maxBanca.toFixed(1);
  document.getElementById("prMuerto").textContent = maxMuerto.toFixed(1);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const ejercicio = document.getElementById("exercise").value;
  const peso = Number(document.getElementById("peso").value);
  const reps = Number(document.getElementById("reps").value);
  const series = Number(document.getElementById("series").value);
  const rpe = Number(document.getElementById("rpe").value);
  const notas = document.getElementById("notas").value.trim();

  if (!peso || !reps || !series) {
    alert("Completa peso, reps y series");
    return;
  }

  const maxpeso = calcular1RM(peso, reps);
  const volumen = peso * reps * series;
  const maximoAnterior = await obtenerMaximoPorEjercicio(ejercicio);
  const esPR = maxpeso > maximoAnterior;

  await addDoc(collection(db, "usuarios", usuarioActual.uid, "registros"), {
    ejercicio,
    peso,
    reps,
    series,
    rpe,
    notas,
    volumen,
    maxpeso,
    esPR,
    fecha: new Date().toLocaleDateString("es-MX"),
    creado: serverTimestamp()
  });

  form.reset();
  await actualizarPRs();
});

function cargarRegistros(uid) {
  if (cancelarEscucha) cancelarEscucha();

  const consulta = query(
    collection(db, "usuarios", uid, "registros"),
    orderBy("creado", "desc")
  );

  cancelarEscucha = onSnapshot(consulta, (snapshot) => {
    lista.innerHTML = "<h2>Últimos registros</h2>";

    if (snapshot.empty) {
      lista.innerHTML += `<p class="empty">Todavía no hay registros.</p>`;
      return;
    }

    snapshot.forEach((documento) => {
      const r = documento.data();
      const maxpesoMostrar = Number(r.maxpeso || 0).toFixed(1);

      lista.innerHTML += `
        <div class="exercise">
          <div>
            <h3>${r.ejercicio}</h3>
            <p>${r.series} series · ${r.reps} reps · ${r.peso} kg</p>
            <p>1RM estimado: ${maxpesoMostrar} kg</p>
            <p>${r.esPR ? "🏆 Nuevo PR" : "No es PR"}</p>
            <p>Volumen: ${r.volumen} kg · ${r.fecha}</p>
            ${r.notas ? `<p>Nota: ${r.notas}</p>` : ""}
          </div>

          <div class="right">
            <span>RPE ${r.rpe || "-"}</span>
            <button class="delete" data-id="${documento.id}">×</button>
          </div>
        </div>
      `;
    });

    document.querySelectorAll(".delete").forEach((boton) => {
      boton.addEventListener("click", async () => {
        await deleteDoc(doc(db, "usuarios", uid, "registros", boton.dataset.id));
        await actualizarPRs();
      });
    });
  });
}