import { auth, db, authPreparado } from "./firebase.js";
import {
  collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc,
  serverTimestamp, getDoc, setDoc
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
let nombreActual = "Usuario";
let registrosNormales = [];
let registrosRutina = [];
let cancelarNormales = null;
let cancelarRutinas = null;

await authPreparado.catch(console.error);
onAuthStateChanged(auth, async (user) => {
  cancelarNormales?.();
  cancelarRutinas?.();
  usuarioActual = user;

  if (!user) {
    window.location.replace("index.html");
    return;
  }

  app.classList.remove("hidden");
  loading.classList.add("hidden");

  try {
    const perfil = await getDoc(doc(db, "usuarios", user.uid));
    nombreActual = perfil.exists() ? (perfil.data().nombre || "Usuario") : "Usuario";
    nombreUsuario.textContent = nombreActual;
  } catch (error) {
    console.warn("No se pudo leer el perfil:", error);
  }

  cancelarNormales = escucharColeccion(user.uid, "registros", (snapshot) => {
    registrosNormales = snapshot.docs.map((d) => normalizarRegistro(d.id, d.data()));
    renderizar();
  });

  cancelarRutinas = escucharColeccion(user.uid, "registrosRutina", (snapshot) => {
    registrosRutina = snapshot.docs.flatMap((d) => normalizarSesionRutina(d.id, d.data()));
    renderizar();
  });
});

function escucharColeccion(uid, nombre, actualizar) {
  const consulta = query(collection(db, "usuarios", uid, nombre), orderBy("creado", "desc"));
  return onSnapshot(consulta, { includeMetadataChanges: true }, actualizar, (error) => {
    console.error(`Error en ${nombre}:`, error);
  });
}

function normalizarRegistro(id, r) {
  const peso = Number(r.peso) || 0;
  const reps = Number(r.reps) || 0;
  return {
    id, ejercicio: r.ejercicio || "", peso, reps,
    series: Number(r.series) || 0,
    rpe: r.rpe == null ? null : Number(r.rpe),
    notas: r.notas || "",
    maxpeso: Number(r.maxpeso) || calcular1RM(peso, reps),
    volumen: Number(r.volumen) || peso * reps * (Number(r.series) || 0),
    fecha: r.fecha || "", fechaISO: r.fechaISO || "", creado: r.creado,
    origen: "registro"
  };
}

function normalizarSesionRutina(id, sesion) {
  return (Array.isArray(sesion.ejercicios) ? sesion.ejercicios : []).map((e, i) => {
    const peso = Number(e.pesoReal) || 0;
    const reps = Number(e.repsReal) || 0;
    const series = Number(e.seriesReal) || Number(e.seriesObjetivo) || 1;
    return {
      id: `${id}-${i}`, ejercicio: e.ejercicio || "", peso, reps, series,
      rpe: e.rpeReal == null ? null : Number(e.rpeReal),
      notas: `Rutina: ${sesion.nombreRutina || "Rutina"}`,
      maxpeso: calcular1RM(peso, reps), volumen: peso * reps * series,
      fecha: sesion.fecha || "", fechaISO: sesion.fechaISO || "", creado: sesion.creado,
      origen: "rutina"
    };
  });
}

function tiempo(r) {
  if (typeof r.creado?.toMillis === "function") return r.creado.toMillis();
  if (Number.isFinite(r.creado?.seconds)) return r.creado.seconds * 1000;
  const iso = Date.parse(r.fechaISO || "");
  return Number.isFinite(iso) ? iso : 0;
}

function combinar() {
  return [...registrosNormales, ...registrosRutina].sort((a, b) => tiempo(b) - tiempo(a));
}

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
      fecha: fechaLocal(), fechaISO: new Date().toISOString(), creado: serverTimestamp()
    });
    form.reset();
  } catch (error) {
    console.error(error);
    alert("No se pudo guardar el registro");
  }
});

lista.addEventListener("click", async (event) => {
  const boton = event.target.closest(".delete");
  if (!boton || boton.dataset.origen !== "registro" || !usuarioActual || !confirm("¿Eliminar este registro?")) return;
  try {
    await deleteDoc(doc(db, "usuarios", usuarioActual.uid, "registros", boton.dataset.id));
  } catch (error) {
    console.error(error);
    alert("No se pudo eliminar el registro");
  }
});

async function actualizarRanking(maximos) {
  if (!usuarioActual) return;
  const total = maximos["Sentadilla"] + maximos["Press banca"] + maximos["Peso muerto"];
  try {
    await setDoc(doc(db, "ranking", usuarioActual.uid), {
      uid: usuarioActual.uid,
      nombre: nombreActual,
      sentadilla: Number(maximos["Sentadilla"].toFixed(1)),
      banca: Number(maximos["Press banca"].toFixed(1)),
      muerto: Number(maximos["Peso muerto"].toFixed(1)),
      total: Number(total.toFixed(1)),
      actualizado: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.warn("No se pudo actualizar el ranking. Revisa las reglas de Firestore:", error);
  }
}

function renderizar() {
  const registros = combinar();
  const maximos = { "Sentadilla": 0, "Press banca": 0, "Peso muerto": 0 };

  for (const r of registros) {
    const estimado = Number(r.maxpeso) || calcular1RM(r.peso, r.reps);
    if (r.ejercicio in maximos) maximos[r.ejercicio] = Math.max(maximos[r.ejercicio], estimado);
  }

  Object.entries(prs).forEach(([nombre, elemento]) => {
    if (elemento) elemento.textContent = maximos[nombre].toFixed(1);
  });
  actualizarRanking(maximos);

  if (!registros.length) {
    lista.innerHTML = '<h2>Últimos registros</h2><p class="empty">Todavía no hay registros.</p>';
    return;
  }

  lista.innerHTML = `<h2>Últimos registros</h2>${registros.slice(0, 20).map((r) => {
    const max = Number(r.maxpeso) || calcular1RM(r.peso, r.reps);
    const eliminar = r.origen === "registro"
      ? `<button class="delete" data-id="${r.id}" data-origen="registro" type="button" aria-label="Eliminar">×</button>`
      : "";
    return `<article class="exercise"><div><h3>${escaparHTML(r.ejercicio)}</h3>
      <p>${Number(r.series)} series · ${Number(r.reps)} reps · ${Number(r.peso)} kg</p>
      <p>1RM estimado: ${max.toFixed(1)} kg</p>
      <p>${r.origen === "rutina" ? "Registrado desde rutina · " : ""}${escaparHTML(r.fecha || "")}</p>
      ${r.notas ? `<p>Nota: ${escaparHTML(r.notas)}</p>` : ""}</div>
      <div class="right"><span>${r.rpe == null ? "Sin RPE" : `RPE ${Number(r.rpe)}`}</span>${eliminar}</div></article>`;
  }).join("")}`;
}
