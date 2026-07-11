import { auth, db, authPreparado } from "./firebase.js";
import {
  collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { calcular1RM, escaparHTML } from "./utils.js";

const selectorRutina = document.getElementById("selectorRutina");
const nombreRutinaActiva = document.getElementById("nombreRutinaActiva");
const estadoRutina = document.getElementById("estadoRutina");
const contenedorRutina = document.getElementById("contenedorRutina");
const historialRutina = document.getElementById("historialRutina");

let usuarioActual = null;
let rutinas = [];
let rutinaActualId = null;
let rutinaActual = null;
let ejerciciosCompletados = [];
let historialEjercicios = [];
let cancelarRutinas = null;
let cancelarNormales = null;
let cancelarSesiones = null;
let nombreActual = "Usuario";

await authPreparado.catch(console.error);
onAuthStateChanged(auth, (user) => {
  cancelarRutinas?.(); cancelarNormales?.(); cancelarSesiones?.();
  if (!user) return window.location.replace("index.html");
  usuarioActual = user;
  getDoc(doc(db, "usuarios", user.uid)).then((perfil) => {
    if (perfil.exists()) nombreActual = perfil.data().nombre || "Usuario";
  }).catch(console.warn);
  cargarRutinas();
  cargarHistorialGeneral();
});

function cargarRutinas() {
  const consulta = query(collection(db, "usuarios", usuarioActual.uid, "rutina"), orderBy("creado", "desc"));
  cancelarRutinas = onSnapshot(consulta, (snapshot) => {
    rutinas = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    selectorRutina.innerHTML = rutinas.length
      ? `<option value="">Selecciona una rutina</option>${rutinas.map((r) => `<option value="${r.id}">${escaparHTML(r.nombre)}</option>`).join("")}`
      : `<option value="">No tienes rutinas</option>`;

    if (!rutinas.length) {
      contenedorRutina.innerHTML = '<h2>Ejercicios</h2><p class="empty">Ve a Crear para hacer tu primera rutina.</p>';
    }
  }, console.error);
}

function cargarHistorialGeneral() {
  const consultaNormales = query(collection(db, "usuarios", usuarioActual.uid, "registros"), orderBy("creado", "desc"));
  const consultaSesiones = query(collection(db, "usuarios", usuarioActual.uid, "registrosRutina"), orderBy("creado", "desc"));
  let normales = [];
  let sesiones = [];

  cancelarNormales = onSnapshot(consultaNormales, (snapshot) => {
    normales = snapshot.docs.map((d) => ({ id: d.id, ...d.data(), origen: "registro" }));
    historialEjercicios = [...normales, ...sesiones].sort((a, b) => tiempo(b) - tiempo(a));
    if (rutinaActual) mostrarRutina(rutinaActual);
  }, console.error);

  cancelarSesiones = onSnapshot(consultaSesiones, (snapshot) => {
    sesiones = snapshot.docs.flatMap((d) => {
      const sesion = d.data();
      return (Array.isArray(sesion.ejercicios) ? sesion.ejercicios : []).map((e, i) => ({
        id: `${d.id}-${i}`,
        ejercicio: e.ejercicio || "",
        peso: Number(e.pesoReal) || 0,
        reps: Number(e.repsReal) || 0,
        series: Number(e.seriesReal) || Number(e.seriesObjetivo) || 1,
        rpe: e.rpeReal == null ? null : Number(e.rpeReal),
        fecha: sesion.fecha || "",
        fechaISO: sesion.fechaISO || "",
        creado: sesion.creado,
        origen: "rutina"
      }));
    });
    historialEjercicios = [...normales, ...sesiones].sort((a, b) => tiempo(b) - tiempo(a));
    renderizarHistorialSesiones(snapshot.docs.map((d) => d.data()));
    actualizarRankingDesdeHistorial();
    if (rutinaActual) mostrarRutina(rutinaActual);
  }, console.error);
}

function tiempo(r) {
  if (typeof r.creado?.toMillis === "function") return r.creado.toMillis();
  if (Number.isFinite(r.creado?.seconds)) return r.creado.seconds * 1000;
  const iso = Date.parse(r.fechaISO || "");
  return Number.isFinite(iso) ? iso : 0;
}

function ultimoRegistro(nombre) {
  return historialEjercicios.find((r) => r.ejercicio === nombre && Number(r.peso) > 0 && Number(r.reps) > 0) || null;
}

function notaAnterior(nombre) {
  const anterior = ultimoRegistro(nombre);
  if (!anterior) return '<p class="previous-note empty">Sin registros anteriores para este ejercicio.</p>';
  const rpe = anterior.rpe == null || Number.isNaN(Number(anterior.rpe)) ? "Sin RPE" : `RPE ${Number(anterior.rpe)}`;
  return `<aside class="previous-note"><strong>Última vez</strong><span>${Number(anterior.peso)} kg × ${Number(anterior.reps)} reps · ${Number(anterior.series) || 1} series</span><span>${rpe} · ${escaparHTML(anterior.fecha || "Sin fecha")}</span><span>1RM estimado: ${calcular1RM(Number(anterior.peso), Number(anterior.reps)).toFixed(1)} kg</span></aside>`;
}

selectorRutina.addEventListener("change", () => {
  const id = selectorRutina.value;
  if (!id) {
    rutinaActualId = null; rutinaActual = null; ejerciciosCompletados = [];
    nombreRutinaActiva.textContent = "Sin rutina"; estadoRutina.textContent = "---";
    contenedorRutina.innerHTML = '<h2>Ejercicios</h2><p class="empty">Selecciona una rutina para comenzar.</p>';
    return;
  }
  rutinaActual = rutinas.find((r) => r.id === id);
  rutinaActualId = id;
  ejerciciosCompletados = [];
  mostrarRutina(rutinaActual);
});

function mostrarRutina(rutina) {
  if (!rutina) return;
  nombreRutinaActiva.textContent = rutina.nombre;
  estadoRutina.textContent = rutina.estado || "activa";
  const ejercicios = Array.isArray(rutina.ejercicios) ? rutina.ejercicios : [];

  contenedorRutina.innerHTML = `<h2>Ejercicios</h2>${ejercicios.map((item, index) => `
    <article class="routine-exercise ${ejerciciosCompletados[index] ? "completed" : ""}" id="ejercicio-card-${index}">
      ${item.imagen ? `<img src="${escaparHTML(item.imagen)}" alt="${escaparHTML(item.ejercicio)}" class="exercise-image routine-main-image">` : ""}
      <div class="routine-top"><div><h3><span class="routine-number">${index + 1}</span>${escaparHTML(item.ejercicio)}<span id="check-${index}" class="check">${ejerciciosCompletados[index] ? "✅" : ""}</span></h3>
      <p>${Number(item.series)} series · ${Number(item.repsObjetivo)} reps objetivo</p></div></div>
      ${notaAnterior(item.ejercicio)}
      <div class="routine-inputs">
        <div><label for="pesoReal-${index}">Peso realizado</label><input id="pesoReal-${index}" type="number" min="0" step="0.5" placeholder="kg" value="${ejerciciosCompletados[index]?.pesoReal ?? ""}"></div>
        <div><label for="repsReal-${index}">Reps reales</label><input id="repsReal-${index}" type="number" min="1" placeholder="reps" value="${ejerciciosCompletados[index]?.repsReal ?? ""}"></div>
        <div><label for="rpeReal-${index}">RPE</label><input id="rpeReal-${index}" type="number" min="0" max="10" step="0.5" placeholder="RPE" value="${ejerciciosCompletados[index]?.rpeReal ?? ""}"></div>
      </div>
      <button class="complete-routine" data-index="${index}" type="button">${ejerciciosCompletados[index] ? "Actualizar ejercicio" : "Completar ejercicio"}</button>
    </article>`).join("")}
    <button id="guardarSesionRutina" type="button">Guardar sesión de rutina</button>`;
}

contenedorRutina.addEventListener("click", (event) => {
  const boton = event.target.closest(".complete-routine");
  if (boton) completarEjercicio(Number(boton.dataset.index));
  if (event.target.closest("#guardarSesionRutina")) guardarSesionRutina();
});

function completarEjercicio(index) {
  if (!rutinaActual || !rutinaActualId) return alert("Selecciona una rutina primero");
  const ejercicio = rutinaActual.ejercicios[index];
  const pesoReal = Number(document.getElementById(`pesoReal-${index}`).value);
  const repsReal = Number(document.getElementById(`repsReal-${index}`).value);
  const rpeTexto = document.getElementById(`rpeReal-${index}`).value;
  const rpeReal = rpeTexto === "" ? null : Number(rpeTexto);

  if (!(pesoReal > 0) || !(repsReal > 0)) return alert("Agrega peso y reps realizadas");
  if (rpeReal !== null && (rpeReal < 0 || rpeReal > 10)) return alert("El RPE debe estar entre 0 y 10");

  ejerciciosCompletados[index] = {
    ejercicio: ejercicio.ejercicio,
    seriesObjetivo: Number(ejercicio.series) || 1,
    repsObjetivo: Number(ejercicio.repsObjetivo) || 1,
    seriesReal: Number(ejercicio.series) || 1,
    pesoReal, repsReal, rpeReal,
    maxpeso: calcular1RM(pesoReal, repsReal)
  };
  mostrarRutina(rutinaActual);
}

async function guardarSesionRutina() {
  if (!rutinaActual || !rutinaActualId) return alert("Selecciona una rutina primero");
  const ejerciciosFiltrados = ejerciciosCompletados.filter(Boolean);
  if (!ejerciciosFiltrados.length) return alert("Completa mínimo un ejercicio antes de guardar");

  try {
    await addDoc(collection(db, "usuarios", usuarioActual.uid, "registrosRutina"), {
      rutinaId: rutinaActualId,
      nombreRutina: rutinaActual.nombre,
      ejercicios: ejerciciosFiltrados,
      totalEjercicios: rutinaActual.ejercicios.length,
      ejerciciosCompletados: ejerciciosFiltrados.length,
      fecha: new Date().toLocaleDateString("es-MX"),
      fechaISO: new Date().toISOString(),
      creado: serverTimestamp()
    });
    ejerciciosCompletados = [];
    mostrarRutina(rutinaActual);
    alert("Sesión guardada. Los PR también se actualizarán en Inicio y Progreso.");
  } catch (error) {
    console.error(error);
    alert("No se pudieron guardar los datos");
  }
}


async function actualizarRankingDesdeHistorial() {
  if (!usuarioActual) return;
  const maximos = { "Sentadilla": 0, "Press banca": 0, "Peso muerto": 0 };
  for (const r of historialEjercicios) {
    if (!(r.ejercicio in maximos)) continue;
    const estimado = Number(r.maxpeso) || calcular1RM(Number(r.peso) || 0, Number(r.reps) || 0);
    maximos[r.ejercicio] = Math.max(maximos[r.ejercicio], estimado);
  }
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
    console.warn("No se pudo actualizar el ranking:", error);
  }
}

function renderizarHistorialSesiones(sesiones) {
  historialRutina.innerHTML = `<h2>Registros de rutina</h2>${sesiones.length ? sesiones.slice(0, 10).map((r) => `
    <article class="exercise"><div><h3>${escaparHTML(r.nombreRutina || "Rutina")}</h3><p>${Number(r.ejerciciosCompletados) || 0}/${Number(r.totalEjercicios) || 0} ejercicios completados</p><p>${escaparHTML(r.fecha || "")}</p></div></article>`).join("") : '<p class="empty">Todavía no hay registros.</p>'}`;
}
