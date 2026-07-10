import { auth, db, authPreparado } from "./firebase.js";
import { collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { calcular1RM, escaparHTML } from "./utils.js";

const ui = {
  app: document.getElementById("appProtegida"), loading: document.getElementById("loadingScreen"),
  sentadilla: document.getElementById("prSentadilla"), banca: document.getElementById("prBanca"), muerto: document.getElementById("prMuerto"),
  total: document.getElementById("totalEntrenamientos"), volumen: document.getElementById("volumenTotal"),
  lista: document.getElementById("ultimosRegistros"), ejercicio: document.getElementById("ejercicioGrafica"),
  canvas: document.getElementById("graficaMaximos"), detalle: document.getElementById("detallePunto"), tabla: document.getElementById("tablaProgreso")
};

let normales = [], rutinas = [], puntosCanvas = [];
let cancelarNormales, cancelarRutinas;

await authPreparado.catch(console.error);
onAuthStateChanged(auth, (user) => {
  cancelarNormales?.(); cancelarRutinas?.();
  if (!user) return window.location.replace("index.html");
  ui.app.classList.remove("hidden"); ui.loading.classList.add("hidden");

  cancelarNormales = escuchar(user.uid, "registros", (d) => normalizarRegistro(d.id, d.data()), (datos) => { normales = datos; renderizar(); });
  cancelarRutinas = escuchar(user.uid, "registrosRutina", (d) => normalizarRutina(d.id, d.data()), (datos) => { rutinas = datos.flat(); renderizar(); });
});

function escuchar(uid, nombre, transformar, actualizar) {
  const consulta = query(collection(db, "usuarios", uid, nombre), orderBy("creado", "desc"));
  return onSnapshot(consulta, { includeMetadataChanges: true }, (snapshot) => actualizar(snapshot.docs.map(transformar)), (error) => console.error(`Error en ${nombre}:`, error));
}

function normalizarRegistro(id, r) {
  const peso = Number(r.peso) || 0, reps = Number(r.reps) || 0, series = Number(r.series) || 0;
  return { id, ejercicio: r.ejercicio || "", peso, reps, series, volumen: Number(r.volumen) || peso * reps * series,
    maxpeso: Number(r.maxpeso) || calcular1RM(peso, reps), fecha: r.fecha || "", fechaISO: r.fechaISO || "", creado: r.creado, origen: "registro" };
}

function normalizarRutina(id, sesion) {
  return (Array.isArray(sesion.ejercicios) ? sesion.ejercicios : []).map((e, i) => {
    const peso = Number(e.pesoReal) || 0, reps = Number(e.repsReal) || 0, series = Number(e.seriesReal) || Number(e.seriesObjetivo) || 1;
    return { id: `${id}-${i}`, ejercicio: e.ejercicio || "", peso, reps, series, volumen: peso * reps * series,
      maxpeso: calcular1RM(peso, reps), fecha: sesion.fecha || "", fechaISO: sesion.fechaISO || "", creado: sesion.creado,
      origen: "rutina", nombreRutina: sesion.nombreRutina || "Rutina" };
  });
}

function tiempo(r) {
  if (r.creado?.toMillis) return r.creado.toMillis();
  if (r.creado?.seconds) return r.creado.seconds * 1000;
  if (r.fechaISO) { const t = Date.parse(r.fechaISO); if (Number.isFinite(t)) return t; }
  const partes = String(r.fecha || "").split(/[\/-]/).map(Number);
  if (partes.length === 3) {
    const [a, b, c] = partes;
    const fecha = a > 1900 ? new Date(a, b - 1, c) : new Date(c, b - 1, a);
    return fecha.getTime();
  }
  return 0;
}

function fechaVisible(r) {
  const t = tiempo(r);
  return t ? new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "2-digit" }).format(new Date(t)) : (r.fecha || "Sin fecha");
}

function combinar() { return [...normales, ...rutinas].sort((a, b) => tiempo(b) - tiempo(a)); }

ui.ejercicio.addEventListener("change", renderizar);
window.addEventListener("resize", () => dibujar(combinar(), ui.ejercicio.value));
ui.canvas.addEventListener("click", (event) => {
  if (!puntosCanvas.length) return;
  const rect = ui.canvas.getBoundingClientRect();
  const x = event.clientX - rect.left, y = event.clientY - rect.top;
  const cercano = puntosCanvas.reduce((mejor, p) => Math.hypot(p.x - x, p.y - y) < Math.hypot(mejor.x - x, mejor.y - y) ? p : mejor);
  if (Math.hypot(cercano.x - x, cercano.y - y) <= 28) ui.detalle.textContent = `${cercano.fecha}: ${cercano.peso.toFixed(1)} kg`;
});

function renderizar() {
  const datos = combinar();
  const maximos = { "Sentadilla": 0, "Press banca": 0, "Peso muerto": 0 };
  let volumen = 0;
  for (const r of datos) {
    volumen += r.volumen || 0;
    if (r.ejercicio in maximos) maximos[r.ejercicio] = Math.max(maximos[r.ejercicio], r.maxpeso || 0);
  }
  ui.sentadilla.textContent = maximos["Sentadilla"].toFixed(1);
  ui.banca.textContent = maximos["Press banca"].toFixed(1);
  ui.muerto.textContent = maximos["Peso muerto"].toFixed(1);
  ui.total.textContent = String(datos.length);
  ui.volumen.textContent = `${volumen.toFixed(1)} kg`;

  ui.lista.innerHTML = `<h2>Últimos registros</h2>${datos.length ? datos.slice(0, 10).map((r) => `<article class="exercise"><div><h3>${escaparHTML(r.ejercicio)}</h3><p>${r.series} series · ${r.reps} reps · ${r.peso} kg</p><p>1RM estimado: ${r.maxpeso.toFixed(1)} kg</p><p>${fechaVisible(r)}</p></div></article>`).join("") : '<p class="empty">Todavía no hay registros.</p>'}`;

  const ejercicio = ui.ejercicio.value;
  const serie = datos.filter((r) => r.ejercicio === ejercicio && r.maxpeso > 0).sort((a, b) => tiempo(a) - tiempo(b));
  ui.tabla.innerHTML = serie.length ? `<div class="table-head"><span>Fecha</span><span>Peso</span></div>${serie.slice(-12).reverse().map((r) => `<div class="table-row"><span>${escaparHTML(fechaVisible(r))}</span><strong>${r.maxpeso.toFixed(1)} kg</strong></div>`).join("")}` : "";
  ui.detalle.textContent = serie.length ? "Toca un punto para ver peso y fecha." : "No hay datos para este ejercicio.";
  dibujar(datos, ejercicio);
}

function dibujar(datos, ejercicio) {
  const canvas = ui.canvas, rect = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  const cssWidth = Math.max(300, rect.width || 350), cssHeight = 300;
  canvas.width = Math.round(cssWidth * dpr); canvas.height = Math.round(cssHeight * dpr);
  canvas.style.height = `${cssHeight}px`;
  const ctx = canvas.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, cssWidth, cssHeight);

  const puntos = datos.filter((r) => r.ejercicio === ejercicio && r.maxpeso > 0).sort((a, b) => tiempo(a) - tiempo(b));
  puntosCanvas = [];
  if (!puntos.length) {
    ctx.fillStyle = "#94a3b8"; ctx.font = "14px Arial"; ctx.textAlign = "center"; ctx.fillText("No hay datos para este ejercicio", cssWidth / 2, cssHeight / 2); return;
  }

  const pad = { l: 58, r: 18, t: 24, b: 64 };
  const valores = puntos.map((p) => p.maxpeso);
  let min = Math.floor((Math.min(...valores) - 5) / 5) * 5;
  let max = Math.ceil((Math.max(...valores) + 5) / 5) * 5;
  if (min < 0) min = 0; if (max === min) max = min + 10;
  const plotW = cssWidth - pad.l - pad.r, plotH = cssHeight - pad.t - pad.b;

  ctx.font = "11px Arial"; ctx.lineWidth = 1; ctx.textAlign = "right"; ctx.textBaseline = "middle";
  const pasosY = 5;
  for (let i = 0; i <= pasosY; i++) {
    const valor = min + (max - min) * i / pasosY;
    const y = pad.t + plotH - plotH * i / pasosY;
    ctx.strokeStyle = "rgba(148,163,184,.22)"; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(cssWidth - pad.r, y); ctx.stroke();
    ctx.fillStyle = "#cbd5e1"; ctx.fillText(`${valor.toFixed(0)} kg`, pad.l - 7, y);
  }

  ctx.strokeStyle = "#64748b"; ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, pad.t + plotH); ctx.lineTo(cssWidth - pad.r, pad.t + plotH); ctx.stroke();

  const maxEtiquetas = Math.min(5, puntos.length);
  ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillStyle = "#cbd5e1";
  for (let i = 0; i < maxEtiquetas; i++) {
    const indice = maxEtiquetas === 1 ? 0 : Math.round(i * (puntos.length - 1) / (maxEtiquetas - 1));
    const x = puntos.length === 1 ? pad.l + plotW / 2 : pad.l + indice * plotW / (puntos.length - 1);
    ctx.fillText(fechaVisible(puntos[indice]), x, pad.t + plotH + 10);
  }

  ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 3; ctx.lineJoin = "round"; ctx.beginPath();
  puntos.forEach((p, i) => {
    const x = puntos.length === 1 ? pad.l + plotW / 2 : pad.l + i * plotW / (puntos.length - 1);
    const y = pad.t + plotH - (p.maxpeso - min) * plotH / (max - min);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    puntosCanvas.push({ x, y, peso: p.maxpeso, fecha: fechaVisible(p) });
  });
  ctx.stroke();

  puntosCanvas.forEach((p) => {
    ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#f8fafc"; ctx.lineWidth = 2; ctx.stroke();
  });
}
