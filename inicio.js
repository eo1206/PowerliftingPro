import { auth, db, authPreparado } from "./firebase.js";
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { calcular1RM, escaparHTML, fechaLocal, numeroValido } from "./utils.js";

const form = document.getElementById("trainingForm");
const lista = document.getElementById("listaRegistros");
const prs = {
  "Sentadilla": document.getElementById("prSentadilla"),
  "Press banca": document.getElementById("prBanca"),
  "Peso muerto": document.getElementById("prMuerto")
};

let usuarioActual = null;
let cancelarEscucha = null;
let registros = [];

await authPreparado.catch((error) => console.error("No se pudo restaurar la sesión:", error));

onAuthStateChanged(auth, (user) => {
  usuarioActual = user;
  cancelarEscucha?.();
  cancelarEscucha = null;

  if (!user) {
    registros = [];
    renderizar();
    return;
  }

  const consulta = query(collection(db, "usuarios", user.uid, "registros"), orderBy("creado", "desc"));
  cancelarEscucha = onSnapshot(consulta, { includeMetadataChanges: true }, (snapshot) => {
    registros = snapshot.docs.map((documento) => ({ id: documento.id, ...documento.data() }));
    renderizar();
  }, (error) => {
    console.error("No se pudieron escuchar los registros:", error);
    lista.innerHTML = '<h2>Últimos registros</h2><p class="empty">No se pudieron cargar los registros.</p>';
  });
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!usuarioActual) return alert("Primero inicia sesión");

  const ejercicio = document.getElementById("exercise").value;
  const peso = numeroValido(document.getElementById("peso").value);
  const reps = numeroValido(document.getElementById("reps").value, { maximo: 36 });
  const series = numeroValido(document.getElementById("series").value);
  const rpe = Number(document.getElementById("rpe").value) || 0;
  const notas = document.getElementById("notas").value.trim();

  if (!peso || !reps || !series) return alert("Completa peso, reps y series con valores válidos");
  if (rpe < 0 || rpe > 10) return alert("El RPE debe estar entre 0 y 10");

  try {
    await addDoc(collection(db, "usuarios", usuarioActual.uid, "registros"), {
      ejercicio, peso, reps, series, rpe, notas,
      volumen: peso * reps * series,
      maxpeso: calcular1RM(peso, reps),
      fecha: fechaLocal(),
      creado: serverTimestamp()
    });
    form.reset();
  } catch (error) {
    console.error("No se pudo guardar el registro:", error);
    alert("No se pudo guardar el registro");
  }
});

lista?.addEventListener("click", async (event) => {
  const boton = event.target.closest(".delete");
  if (!boton || !usuarioActual || !confirm("¿Quieres eliminar este registro?")) return;
  try {
    await deleteDoc(doc(db, "usuarios", usuarioActual.uid, "registros", boton.dataset.id));
  } catch (error) {
    console.error(error);
    alert("No se pudo eliminar el registro");
  }
});

function renderizar() {
  actualizarPRs();
  if (!lista) return;
  if (!registros.length) {
    lista.innerHTML = '<h2>Últimos registros</h2><p class="empty">Todavía no hay registros.</p>';
    return;
  }

  lista.innerHTML = `<h2>Últimos registros</h2>${registros.slice(0, 20).map((r) => `
    <article class="exercise">
      <div>
        <h3>${escaparHTML(r.ejercicio || "Ejercicio")}</h3>
        <p>${Number(r.series) || 0} series · ${Number(r.reps) || 0} reps · ${Number(r.peso) || 0} kg</p>
        <p>1RM estimado: ${Number(r.maxpeso || calcular1RM(r.peso, r.reps)).toFixed(1)} kg</p>
        <p>Volumen: ${Number(r.volumen) || 0} kg · ${escaparHTML(r.fecha || "")}</p>
        ${r.notas ? `<p>Nota: ${escaparHTML(r.notas)}</p>` : ""}
      </div>
      <div class="right"><span>RPE ${Number(r.rpe) || "-"}</span><button class="delete" data-id="${r.id}" type="button" aria-label="Eliminar registro">×</button></div>
    </article>`).join("")}`;
}

function actualizarPRs() {
  const maximos = { "Sentadilla": 0, "Press banca": 0, "Peso muerto": 0 };
  for (const r of registros) {
    if (r.ejercicio in maximos) maximos[r.ejercicio] = Math.max(maximos[r.ejercicio], Number(r.maxpeso) || calcular1RM(r.peso, r.reps));
  }
  for (const [ejercicio, elemento] of Object.entries(prs)) if (elemento) elemento.textContent = maximos[ejercicio].toFixed(1);
}
