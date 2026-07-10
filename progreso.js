import { auth, db, authPreparado } from "./firebase.js";
import { collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { calcular1RM, escaparHTML } from "./utils.js";

const ui = {
  sentadilla: document.getElementById("prSentadilla"), banca: document.getElementById("prBanca"), muerto: document.getElementById("prMuerto"),
  total: document.getElementById("totalEntrenamientos"), volumen: document.getElementById("volumenTotal"),
  lista: document.getElementById("ultimosRegistros"), ejercicio: document.getElementById("ejercicioGrafica"),
  canvas: document.getElementById("graficaMaximos")
};
let normales = [];
let rutinas = [];
let cancelarNormales = null;
let cancelarRutinas = null;
let total = prSentadilla +
  prBanca +
  prMuerto;



await authPreparado.catch(console.error);
onAuthStateChanged(auth, (user) => {
  cancelarNormales?.(); cancelarRutinas?.();
  if (!user) {
    if (navigator.onLine) window.location.replace("index.html");
    return;
  }
  cancelarNormales = escuchar(user.uid, "registros", (doc) => {
    const r = doc.data();
    return { id: doc.id, ejercicio: r.ejercicio || "", peso: +r.peso || 0, reps: +r.reps || 0, series: +r.series || 0,
      volumen: +r.volumen || 0, maxpeso: +r.maxpeso || calcular1RM(r.peso, r.reps), fecha: r.fecha || "", creado: r.creado, origen: "registro" };
  }, (datos) => { normales = datos; renderizar(); });

  cancelarRutinas = escuchar(user.uid, "registrosRutina", (doc) => {
    const s = doc.data();
    return (Array.isArray(s.ejercicios) ? s.ejercicios : []).map((e, i) => {
      const peso = +e.pesoReal || 0, reps = +e.repsReal || 0, series = +e.seriesReal || +e.seriesObjetivo || 1;
      return { id: `${doc.id}-${i}`, ejercicio: e.ejercicio || "", peso, reps, series, volumen: peso * reps * series,
        maxpeso: calcular1RM(peso, reps), fecha: s.fecha || "", creado: s.creado, origen: "rutina", nombreRutina: s.nombreRutina || "Rutina" };
    });
  }, (datos) => { rutinas = datos.flat(); renderizar(); });
});

function escuchar(uid, coleccion, transformar, actualizar) {
  const q = query(collection(db, "usuarios", uid, coleccion), orderBy("creado", "desc"));
  return onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => actualizar(snapshot.docs.map(transformar)), console.error);
}

ui.ejercicio?.addEventListener("change", renderizar);
window.addEventListener("resize", () => dibujar(combinar(), ui.ejercicio?.value || "Sentadilla"));

function combinar() {
  return [...normales, ...rutinas].sort((a, b) => tiempo(b) - tiempo(a));
}

function renderizar() {
  const datos = combinar();
  const maximos = { "Sentadilla": 0, "Press banca": 0, "Peso muerto": 0 };
  let volumen = 0;
  for (const r of datos) {
    volumen += r.volumen || 0;
    if (r.ejercicio in maximos) maximos[r.ejercicio] = Math.max(maximos[r.ejercicio], r.maxpeso || 0);
  }
  if (ui.sentadilla) ui.sentadilla.textContent = maximos["Sentadilla"].toFixed(1);
  if (ui.banca) ui.banca.textContent = maximos["Press banca"].toFixed(1);
  if (ui.muerto) ui.muerto.textContent = maximos["Peso muerto"].toFixed(1);
  if (ui.total) ui.total.textContent = `${datos.length} registros`;
  if (ui.volumen) ui.volumen.textContent = `${volumen.toFixed(1)} kg`;

  if (ui.lista) ui.lista.innerHTML = `<h2>Últimos registros</h2>${datos.length ? datos.slice(0, 10).map((r) => `
    <div class="exercise"><div><h3>${escaparHTML(r.ejercicio || "Ejercicio")}</h3>
    <p>${r.series} series · ${r.reps} reps · ${r.peso} kg</p><p>1RM estimado: ${r.maxpeso.toFixed(1)} kg</p>
    <p>Volumen: ${r.volumen.toFixed(1)} kg · ${escaparHTML(r.fecha)}</p>${r.nombreRutina ? `<p>Rutina: ${escaparHTML(r.nombreRutina)}</p>` : ""}</div></div>`).join("") : '<p class="empty">Todavía no hay registros.</p>'}`;
  dibujar(datos, ui.ejercicio?.value || "Sentadilla");
}

function tiempo(r) {
  if (r.creado?.toMillis) return r.creado.toMillis();
  if (r.creado?.seconds) return r.creado.seconds * 1000;
  const [d, m, a] = String(r.fecha || "").split("/").map(Number);
  return a ? new Date(a, m - 1, d).getTime() : 0;
}

function dibujar(datos, ejercicio) {
  const canvas = ui.canvas;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(300, Math.round(rect.width * dpr));
  canvas.height = Math.round(220 * dpr);
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  const w = canvas.width / dpr, h = canvas.height / dpr;
  ctx.clearRect(0, 0, w, h);
  const puntos = datos.filter((r) => r.ejercicio === ejercicio && r.maxpeso > 0).sort((a, b) => tiempo(a) - tiempo(b));
  if (!puntos.length) {
    ctx.fillStyle = "#94a3b8"; ctx.font = "14px Arial"; ctx.textAlign = "center";
    ctx.fillText("No hay datos para este ejercicio", w / 2, h / 2); return;
  }
  const pad = { l: 48, r: 18, t: 24, b: 36 };
  const vals = puntos.map((p) => p.maxpeso), min = Math.max(0, Math.min(...vals) - 5), max = Math.max(...vals) + 5, rango = max - min || 1;
  ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 3; ctx.beginPath();
  puntos.forEach((p, i) => {
    const x = puntos.length === 1 ? w / 2 : pad.l + i * (w - pad.l - pad.r) / (puntos.length - 1);
    const y = h - pad.b - (p.maxpeso - min) * (h - pad.t - pad.b) / rango;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  });
  ctx.stroke();
  ctx.fillStyle = "#ef4444";
  puntos.forEach((p, i) => {
    const x = puntos.length === 1 ? w / 2 : pad.l + i * (w - pad.l - pad.r) / (puntos.length - 1);
    const y = h - pad.b - (p.maxpeso - min) * (h - pad.t - pad.b) / rango;
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
  });
}
