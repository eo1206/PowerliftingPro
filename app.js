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

const form = document.getElementById("trainingForm");
const lista = document.getElementById("listaRegistros");

let usuarioActual = null;
let cancelarEscucha = null;

onAuthStateChanged(auth, (user) => {
  usuarioActual = user;

  if (user) {
    cargarRegistros(user.uid);
  } else {
    lista.innerHTML = "<h2>Últimos registros</h2>";
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!usuarioActual) {
    alert("Primero inicia sesión");
    return;
  }

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

  const volumen = peso * reps * series;

  try {
    await addDoc(collection(db, "usuarios", usuarioActual.uid, "registros"), {
      ejercicio,
      peso,
      reps,
      series,
      rpe,
      notas,
      volumen,
      fecha: new Date().toLocaleDateString("es-MX"),
      creado: serverTimestamp()
    });

    form.reset();
  } catch (error) {
    alert("No se pudo guardar el registro");
    console.error(error);
  }
});

function cargarRegistros(uid) {
  if (cancelarEscucha) {
    cancelarEscucha();
  }

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

      lista.innerHTML += `
        <div class="exercise">
          <div>
            <h3>${r.ejercicio}</h3>
            <p>${r.series} series · ${r.reps} reps · ${r.peso} kg</p>
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
        const id = boton.dataset.id;
        await borrarRegistro(uid, id);
      });
    });
  });
}

async function borrarRegistro(uid, id) {
  try {
    await deleteDoc(doc(db, "usuarios", uid, "registros", id));
  } catch (error) {
    alert("No se pudo borrar el registro");
    console.error(error);
  }
}


const navLinks = document.querySelectorAll(".bottom-nav a");
const pages = document.querySelectorAll(".page");

navLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();

    navLinks.forEach((a) => a.classList.remove("active"));
    link.classList.add("active");

    const pageId = link.dataset.page;

    pages.forEach((page) => {
      page.classList.remove("active-page");
    });

    document.getElementById(pageId).classList.add("active-page");
  });
});

const rutinaAuto = document.getElementById("rutinaAuto");
const rutinaResultado = document.getElementById("rutinaResultado");

rutinaAuto.addEventListener("click", () => {
  rutinaResultado.innerHTML = `
    <div class="exercise">
      <div>
        <h3>Día 1 - Fuerza</h3>
        <p>Sentadilla 5x3 al 85%</p>
        <p>Press banca 5x3 al 85%</p>
        <p>Peso muerto 3x3 al 80%</p>
      </div>
    </div>

    <div class="exercise">
      <div>
        <h3>Día 2 - Técnica</h3>
        <p>Sentadilla pausa 4x4</p>
        <p>Banca agarre cerrado 4x6</p>
        <p>Remo 4x10</p>
      </div>
    </div>

    <div class="exercise">
      <div>
        <h3>Día 3 - Volumen</h3>
        <p>Sentadilla 4x6 al 70%</p>
        <p>Press banca 4x6 al 70%</p>
        <p>Peso muerto 3x5 al 75%</p>
      </div>
    </div>
  `;
});