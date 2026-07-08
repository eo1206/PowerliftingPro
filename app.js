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