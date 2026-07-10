import { auth, db, authPreparado } from "./firebase.js";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  getDocs,
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


try {
  await authPreparado;
} catch (error) {
  console.error("No se pudo restaurar la sesión:", error);
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    usuarioActual = null;
    return;
  }

  usuarioActual = user;
  cargarRegistros(user.uid);
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
async function cargarRegistros(uid) {
  if (cancelarEscucha) {
    cancelarEscucha();
  }

  const consulta = query(
    collection(db, "usuarios", uid, "registros"),
    orderBy("creado", "desc")
  );

  try {
    // Primera lectura al abrir la aplicación
    const snapshotInicial = await getDocs(consulta);
    mostrarRegistros(snapshotInicial, uid);

    // Después se queda escuchando cambios
    cancelarEscucha = onSnapshot(
      consulta,
      (snapshot) => {
        mostrarRegistros(snapshot, uid);
      },
      (error) => {
        console.error("Error al escuchar registros:", error);
      }
    );
  } catch (error) {
    console.error("Error al cargar registros:", error);

    lista.innerHTML = `
      <h2>Últimos registros</h2>
      <p class="empty">No se pudieron cargar los registros.</p>
    `;
  }
}