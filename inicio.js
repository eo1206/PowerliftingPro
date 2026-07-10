import { auth, db, authPreparado } from "./firebase.js";
import {
  collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc,
  serverTimestamp, getDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { calcular1RM, escaparHTML, fechaLocal, numeroValido } from "./utils.js";

const app = document.getElementById("appScreen");
const loading = document.getElementById("loadingScreen");
const form = document.getElementById("trainingForm");
const lista = document.getElementById("listaRegistros");
const nombreUsuario = document.getElementById("nombreUsuario");
const prs = {
  "Sentadilla": document.getElementById("prSentadilla"),
  "Press banca": document.getElementById("prBanca"),
  "Peso muerto": document.getElementById("prMuerto")
};

let usuarioActual = null;
let cancelarEscucha = null;
let registros = [];

await authPreparado.catch(console.error);
onAuthStateChanged(auth, async (user) => {
  cancelarEscucha?.();
  usuarioActual = user;
  if (!user) {
    window.location.replace("index.html");
    return;
  }

  app.classList.remove("hidden");
  loading.classList.add("hidden");

  try {
    const perfil = await getDoc(doc(db, "usuarios", user.uid));
    if (perfil.exists()) nombreUsuario.textContent = perfil.data().nombre || "Usuario";
  } catch (error) {
    console.warn("Perfil disponible solo desde caché o sin conexión:", error);
  }

  const consulta = query(collection(db, "usuarios", user.uid, "registros"), orderBy("creado", "desc"));
  cancelarEscucha = onSnapshot(consulta, { includeMetadataChanges: true }, (snapshot) => {
    registros = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderizar();
  }, (error) => {
    console.error(error);
    lista.innerHTML = '<h2>Últimos registros</h2><p class="empty">No se pudieron cargar los registros.</p>';
  });
});

document.getElementById("cerrarSesion").addEventListener("click", async () => {
  await signOut(auth);
  window.location.replace("index.html");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!usuarioActual) return;
  const ejercicio = document.getElementById("exercise").value;
  const peso = numeroValido(document.getElementById("peso").value);
  const reps = numeroValido(document.getElementById("reps").value, { maximo: 36 });
  const series = numeroValido(document.getElementById("series").value);
  const rpeTexto = document.getElementById("rpe").value;
  const rpe = rpeTexto === "" ? null : Number(rpeTexto);
  const notas = document.getElementById("notas").value.trim();

  if (!peso || !reps || !series) return alert("Completa peso, reps y series con valores válidos");
  if (rpe !== null && (rpe < 0 || rpe > 10)) return alert("El RPE debe estar entre 0 y 10");

  try {
    await addDoc(collection(db, "usuarios", usuarioActual.uid, "registros"), {
      ejercicio, peso, reps, series, rpe, notas,
      volumen: peso * reps * series,
      maxpeso: calcular1RM(peso, reps),
      fecha: fechaLocal(),
      fechaISO: new Date().toISOString(),
      creado: serverTimestamp()
    });
    form.reset();
  } catch (error) {
    console.error(error);
    alert("No se pudo guardar el registro");
  }
});

lista.addEventListener("click", async (event) => {
  const boton = event.target.closest(".delete");
  if (!boton || !usuarioActual || !confirm("¿Eliminar este registro?")) return;
  try {
    await deleteDoc(doc(db, "usuarios", usuarioActual.uid, "registros", boton.dataset.id));
  } catch (error) {
    console.error(error); alert("No se pudo eliminar el registro");
  }
});

function renderizar() {
  const maximos = { "Sentadilla": 0, "Press banca": 0, "Peso muerto": 0 };
  for (const r of registros) {
    const estimado = Number(r.maxpeso) || calcular1RM(r.peso, r.reps);
    if (r.ejercicio in maximos) maximos[r.ejercicio] = Math.max(maximos[r.ejercicio], estimado);
  }
  Object.entries(prs).forEach(([nombre, elemento]) => elemento.textContent = maximos[nombre].toFixed(1));

  if (!registros.length) {
    lista.innerHTML = '<h2>Últimos registros</h2><p class="empty">Todavía no hay registros.</p>';
    return;
  }
  lista.innerHTML = `<h2>Últimos registros</h2>${registros.slice(0, 20).map((r) => {
    const max = Number(r.maxpeso) || calcular1RM(r.peso, r.reps);
    return `<article class="exercise"><div><h3>${escaparHTML(r.ejercicio)}</h3>
      <p>${Number(r.series)} series · ${Number(r.reps)} reps · ${Number(r.peso)} kg</p>
      <p>1RM estimado: ${max.toFixed(1)} kg</p>
      <p>Volumen: ${Number(r.volumen || 0).toFixed(1)} kg · ${escaparHTML(r.fecha || "")}</p>
      ${r.notas ? `<p>Nota: ${escaparHTML(r.notas)}</p>` : ""}</div>
      <div class="right"><span>${r.rpe == null ? "Sin RPE" : `RPE ${Number(r.rpe)}`}</span><button class="delete" data-id="${r.id}" type="button" aria-label="Eliminar">×</button></div></article>`;
  }).join("")}`;
}

let pesototal = prMuerto + prBanca + prSentadilla;
