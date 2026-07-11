import { auth, db, authPreparado } from "./firebase.js";
import {
  collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { calcular1RM, escaparHTML } from "./utils.js";

const ui = {
  selector: document.getElementById("selectorRutina"),
  nombre: document.getElementById("nombreRutinaActiva"),
  estado: document.getElementById("estadoRutina"),
  contenedor: document.getElementById("contenedorRutina"),
  historial: document.getElementById("historialRutina"),
  timerTexto: document.getElementById("temporizadorTexto"),
  timerEstado: document.getElementById("temporizadorEstado"),
  timerToggle: document.getElementById("iniciarPausarTemporizador"),
  timerReset: document.getElementById("reiniciarTemporizador"),
  timerMas: document.getElementById("aumentarDescanso"),
  timerMenos: document.getElementById("reducirDescanso")
};

let usuarioActual = null;
let nombreActual = "Usuario";
let rutinas = [];
let rutinaActual = null;
let rutinaActualId = null;
let ejerciciosCompletados = [];
let historialEjercicios = [];
let cancelarRutinas = null;
let cancelarNormales = null;
let cancelarSesiones = null;

let duracionBase = 180;
let segundosRestantes = 180;
let temporizadorId = null;
let temporizadorActivo = false;

await authPreparado.catch(console.error);
onAuthStateChanged(auth, (user) => {
  cancelarRutinas?.();
  cancelarNormales?.();
  cancelarSesiones?.();
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
    ui.selector.innerHTML = rutinas.length
      ? `<option value="">Selecciona una rutina</option>${rutinas.map((r) => `<option value="${r.id}">${escaparHTML(r.nombre)}</option>`).join("")}`
      : '<option value="">No tienes rutinas</option>';
    if (!rutinas.length) ui.contenedor.innerHTML = '<h2>Ejercicios</h2><p class="empty">Ve a Crear para hacer tu primera rutina.</p>';
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
        series: Number(e.seriesReal) || (Array.isArray(e.seriesDetalle) ? e.seriesDetalle.length : 1),
        rpe: e.rpeReal == null ? null : Number(e.rpeReal),
        seriesDetalle: Array.isArray(e.seriesDetalle) ? e.seriesDetalle : [],
        maxpeso: Number(e.maxpeso) || 0,
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

function fechaVisible(r) {
  const t = tiempo(r);
  if (t) return new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(t));
  return r.fecha || "Sin fecha";
}

function registrosAnteriores(nombre) {
  return historialEjercicios.filter((r) => r.ejercicio === nombre && Number(r.peso) > 0 && Number(r.reps) > 0).slice(0, 5);
}

function historialDesplegable(nombre) {
  const registros = registrosAnteriores(nombre);
  return `<details class="previous-history">
    <summary>Ver pesos y repeticiones anteriores</summary>
    <div class="previous-history-content">
      ${registros.length ? registros.map((r) => {
        const detalleSeries = Array.isArray(r.seriesDetalle) && r.seriesDetalle.length
          ? r.seriesDetalle.map((s, i) => `<span>Serie ${i + 1}: ${Number(s.peso) || 0} kg × ${Number(s.reps) || 0}</span>`).join("")
          : `<span>${Number(r.series) || 1} series · ${Number(r.peso)} kg × ${Number(r.reps)} reps</span>`;
        return `<article class="previous-entry"><strong>${escaparHTML(fechaVisible(r))}</strong>${detalleSeries}<small>1RM estimado: ${(Number(r.maxpeso) || calcular1RM(Number(r.peso), Number(r.reps))).toFixed(1)} kg</small></article>`;
      }).join("") : '<p class="empty">Sin registros anteriores para este ejercicio.</p>'}
    </div>
  </details>`;
}

ui.selector.addEventListener("change", () => {
  const id = ui.selector.value;
  if (!id) {
    rutinaActualId = null;
    rutinaActual = null;
    ejerciciosCompletados = [];
    ui.nombre.textContent = "Sin rutina";
    ui.estado.textContent = "---";
    ui.contenedor.innerHTML = '<h2>Ejercicios</h2><p class="empty">Selecciona una rutina para comenzar.</p>';
    return;
  }
  rutinaActual = rutinas.find((r) => r.id === id) || null;
  rutinaActualId = id;
  ejerciciosCompletados = [];
  mostrarRutina(rutinaActual);
});

function serieGuardada(indexEjercicio, indexSerie) {
  return ejerciciosCompletados[indexEjercicio]?.seriesDetalle?.[indexSerie] || {};
}

function mostrarRutina(rutina) {
  if (!rutina) return;
  ui.nombre.textContent = rutina.nombre;
  ui.estado.textContent = rutina.estado || "activa";
  const ejercicios = Array.isArray(rutina.ejercicios) ? rutina.ejercicios : [];

  ui.contenedor.innerHTML = `<h2>Ejercicios</h2>${ejercicios.map((item, index) => {
    const cantidadSeries = Math.max(1, Number(item.series) || 1);
    return `<article class="routine-exercise ${ejerciciosCompletados[index] ? "completed" : ""}" id="ejercicio-card-${index}">
      ${item.imagen ? `<div class="routine-image-wrap"><img src="${escaparHTML(item.imagen)}" alt="${escaparHTML(item.ejercicio)}" class="exercise-image routine-main-image" onerror="this.parentElement.hidden=true"></div>` : ""}
      <div class="routine-top"><div><h3><span class="routine-number">${index + 1}</span>${escaparHTML(item.ejercicio)}<span class="check">${ejerciciosCompletados[index] ? "✅" : ""}</span></h3><p>${cantidadSeries} series · ${Number(item.repsObjetivo) || 1} reps objetivo</p></div></div>
      ${historialDesplegable(item.ejercicio)}
      <div class="series-entry-list">
        ${Array.from({ length: cantidadSeries }, (_, serieIndex) => {
          const guardada = serieGuardada(index, serieIndex);
          return `<fieldset class="series-entry"><legend>Serie ${serieIndex + 1}</legend>
            <div class="series-entry-grid">
              <div><label for="peso-${index}-${serieIndex}">Peso</label><input id="peso-${index}-${serieIndex}" type="number" min="0" step="0.5" placeholder="kg" value="${guardada.peso ?? ""}"></div>
              <div><label for="reps-${index}-${serieIndex}">Reps</label><input id="reps-${index}-${serieIndex}" type="number" min="1" placeholder="reps" value="${guardada.reps ?? ""}"></div>
              <div><label for="rpe-${index}-${serieIndex}">RPE</label><input id="rpe-${index}-${serieIndex}" type="number" min="0" max="10" step="0.5" placeholder="RPE" value="${guardada.rpe ?? ""}"></div>
            </div>
          </fieldset>`;
        }).join("")}
      </div>
      <button class="complete-routine" data-index="${index}" type="button">${ejerciciosCompletados[index] ? "Actualizar ejercicio" : "Completar ejercicio"}</button>
    </article>`;
  }).join("")}<button id="guardarSesionRutina" type="button">Guardar sesión de rutina</button>`;
}

ui.contenedor.addEventListener("click", (event) => {
  const boton = event.target.closest(".complete-routine");
  if (boton) completarEjercicio(Number(boton.dataset.index));
  if (event.target.closest("#guardarSesionRutina")) guardarSesionRutina();
});

function completarEjercicio(index) {
  if (!rutinaActual || !rutinaActualId) return alert("Selecciona una rutina primero");
  const ejercicio = rutinaActual.ejercicios[index];
  const cantidadSeries = Math.max(1, Number(ejercicio.series) || 1);
  const seriesDetalle = [];

  for (let i = 0; i < cantidadSeries; i++) {
    const peso = Number(document.getElementById(`peso-${index}-${i}`).value);
    const reps = Number(document.getElementById(`reps-${index}-${i}`).value);
    const rpeTexto = document.getElementById(`rpe-${index}-${i}`).value;
    const rpe = rpeTexto === "" ? null : Number(rpeTexto);
    if (!(peso > 0) || !(reps > 0)) return alert(`Completa peso y repeticiones de la serie ${i + 1}`);
    if (rpe !== null && (rpe < 0 || rpe > 10)) return alert(`El RPE de la serie ${i + 1} debe estar entre 0 y 10`);
    seriesDetalle.push({ peso, reps, rpe });
  }

  const mejorSerie = seriesDetalle.reduce((mejor, serie) => calcular1RM(serie.peso, serie.reps) > calcular1RM(mejor.peso, mejor.reps) ? serie : mejor, seriesDetalle[0]);
  const maxpeso = Math.max(...seriesDetalle.map((serie) => calcular1RM(serie.peso, serie.reps)));

  ejerciciosCompletados[index] = {
    ejercicio: ejercicio.ejercicio,
    seriesObjetivo: cantidadSeries,
    repsObjetivo: Number(ejercicio.repsObjetivo) || 1,
    seriesReal: seriesDetalle.length,
    seriesDetalle,
    pesoReal: mejorSerie.peso,
    repsReal: mejorSerie.reps,
    rpeReal: mejorSerie.rpe,
    maxpeso
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
    alert("Sesión guardada. Los PR se actualizarán en Inicio, Progreso y Ranking.");
  } catch (error) {
    console.error(error);
    alert("No se pudieron guardar los datos");
  }
}

function formatearTiempo(segundos) {
  const minutos = Math.floor(segundos / 60).toString().padStart(2, "0");
  const resto = (segundos % 60).toString().padStart(2, "0");
  return `${minutos}:${resto}`;
}

function actualizarTemporizadorUI() {
  ui.timerTexto.textContent = formatearTiempo(segundosRestantes);
  ui.timerToggle.textContent = temporizadorActivo ? "Pausar" : (segundosRestantes === duracionBase ? "Iniciar" : "Continuar");
  ui.timerEstado.textContent = temporizadorActivo ? "Corriendo" : (segundosRestantes === 0 ? "Terminado" : "Listo");
  document.title = temporizadorActivo ? `${formatearTiempo(segundosRestantes)} · PowerLog` : "PowerliftingPro | Rutina";
}

function detenerTemporizador() {
  if (temporizadorId) clearInterval(temporizadorId);
  temporizadorId = null;
  temporizadorActivo = false;
  actualizarTemporizadorUI();
}

function iniciarTemporizador() {
  if (segundosRestantes <= 0) segundosRestantes = duracionBase;
  temporizadorActivo = true;
  temporizadorId = setInterval(() => {
    segundosRestantes -= 1;
    if (segundosRestantes <= 0) {
      segundosRestantes = 0;
      detenerTemporizador();
      if (navigator.vibrate) navigator.vibrate([250, 120, 250]);
      alert("Descanso terminado");
      return;
    }
    actualizarTemporizadorUI();
  }, 1000);
  actualizarTemporizadorUI();
}

document.querySelectorAll(".timer-preset").forEach((boton) => boton.addEventListener("click", () => {
  detenerTemporizador();
  duracionBase = Number(boton.dataset.segundos) || 180;
  segundosRestantes = duracionBase;
  document.querySelectorAll(".timer-preset").forEach((b) => b.classList.toggle("active", b === boton));
  actualizarTemporizadorUI();
}));

ui.timerToggle.addEventListener("click", () => temporizadorActivo ? detenerTemporizador() : iniciarTemporizador());
ui.timerReset.addEventListener("click", () => { detenerTemporizador(); segundosRestantes = duracionBase; actualizarTemporizadorUI(); });
ui.timerMas.addEventListener("click", () => { segundosRestantes = Math.min(3600, segundosRestantes + 15); duracionBase = Math.max(duracionBase, segundosRestantes); actualizarTemporizadorUI(); });
ui.timerMenos.addEventListener("click", () => { segundosRestantes = Math.max(15, segundosRestantes - 15); if (!temporizadorActivo) duracionBase = segundosRestantes; actualizarTemporizadorUI(); });

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
  ui.historial.innerHTML = `<h2>Registros de rutina</h2>${sesiones.length ? sesiones.slice(0, 10).map((r) => `
    <article class="exercise"><div><h3>${escaparHTML(r.nombreRutina || "Rutina")}</h3><p>${Number(r.ejerciciosCompletados) || 0}/${Number(r.totalEjercicios) || 0} ejercicios completados</p><p>${escaparHTML(r.fecha || "")}</p></div></article>`).join("") : '<p class="empty">Todavía no hay registros.</p>'}`;
}

actualizarTemporizadorUI();
