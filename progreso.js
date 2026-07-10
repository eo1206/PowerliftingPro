import { auth, db, authPreparado } from "./firebase.js";

import {
  collection,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

/* =========================
   ELEMENTOS DEL HTML
========================= */

const prSentadilla = document.getElementById("prSentadilla");
const prBanca = document.getElementById("prBanca");
const prMuerto = document.getElementById("prMuerto");

const totalEntrenamientos =
  document.getElementById("totalEntrenamientos");

const volumenTotal =
  document.getElementById("volumenTotal");

const volSentadilla =
  document.getElementById("volSentadilla");

const volBanca =
  document.getElementById("volBanca");

const volMuerto =
  document.getElementById("volMuerto");

const ultimosRegistros =
  document.getElementById("ultimosRegistros");

const ejercicioGrafica =
  document.getElementById("ejercicioGrafica");

const canvasGrafica =
  document.getElementById("graficaMaximos");

const ctx = canvasGrafica
  ? canvasGrafica.getContext("2d")
  : null;

/* =========================
   VARIABLES
========================= */

let usuarioActual = null;

let registrosNormales = [];
let registrosRutina = [];
let registrosGlobales = [];

let cancelarRegistros = null;
let cancelarRutinas = null;

/* =========================
   CAMBIAR GRÁFICA
========================= */

ejercicioGrafica?.addEventListener("change", () => {
  dibujarGraficaMaximos(ejercicioGrafica.value);
});

/* =========================
   RESTAURAR SESIÓN
========================= */

try {
  await authPreparado;
} catch (error) {
  console.error("No se pudo restaurar la sesión:", error);
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.replace("index.html");
    return;
  }

  usuarioActual = user;

  escucharRegistrosNormales(user.uid);
  escucharRegistrosRutina(user.uid);
});

/* =========================
   LEER REGISTROS DE INICIO
========================= */

function escucharRegistrosNormales(uid) {
  if (cancelarRegistros) {
    cancelarRegistros();
  }

  const consulta = query(
    collection(db, "usuarios", uid, "registros"),
    orderBy("creado", "desc")
  );

  cancelarRegistros = onSnapshot(
    consulta,

    (snapshot) => {
      registrosNormales = [];

      snapshot.forEach((documento) => {
        const r = documento.data();

        registrosNormales.push({
          id: documento.id,
          origen: "registro",
          ejercicio: r.ejercicio || "",
          peso: Number(r.peso) || 0,
          reps: Number(r.reps) || 0,
          series: Number(r.series) || 0,
          rpe: Number(r.rpe) || 0,
          volumen: Number(r.volumen) || 0,
          maxpeso: Number(r.maxpeso) || 0,
          fecha: r.fecha || "",
          creado: r.creado || null
        });
      });

      combinarYMostrar();
    },

    (error) => {
      console.error("Error al leer registros normales:", error);
    }
  );
}

/* =========================
   LEER REGISTROS DE RUTINA
========================= */

function escucharRegistrosRutina(uid) {
  if (cancelarRutinas) {
    cancelarRutinas();
  }

  const consulta = query(
    collection(db, "usuarios", uid, "registrosRutina"),
    orderBy("creado", "desc")
  );

  cancelarRutinas = onSnapshot(
    consulta,

    (snapshot) => {
      registrosRutina = [];

      snapshot.forEach((documento) => {
        const sesion = documento.data();

        const ejercicios = Array.isArray(sesion.ejercicios)
          ? sesion.ejercicios
          : [];

        ejercicios.forEach((ejercicio, index) => {
          const peso = Number(ejercicio.pesoReal) || 0;
          const reps = Number(ejercicio.repsReal) || 0;

          const series =
            Number(ejercicio.seriesReal) ||
            Number(ejercicio.seriesObjetivo) ||
            1;

          const volumen = peso * reps * series;

          registrosRutina.push({
            id: `${documento.id}-${index}`,
            origen: "rutina",
            nombreRutina: sesion.nombreRutina || "Rutina",
            ejercicio: ejercicio.ejercicio || "",
            peso,
            reps,
            series,
            rpe: Number(ejercicio.rpeReal) || 0,
            volumen,
            maxpeso: calcular1RM(peso, reps),
            fecha: sesion.fecha || "",
            creado: sesion.creado || null
          });
        });
      });

      combinarYMostrar();
    },

    (error) => {
      console.error("Error al leer registros de rutina:", error);
    }
  );
}

/* =========================
   COMBINAR COLECCIONES
========================= */

function combinarYMostrar() {
  registrosGlobales = [
    ...registrosNormales,
    ...registrosRutina
  ].sort((a, b) => obtenerTiempo(b) - obtenerTiempo(a));

  mostrarProgreso();
}

/* =========================
   CALCULAR Y MOSTRAR PROGRESO
========================= */

function mostrarProgreso() {
  let mejorSentadilla = 0;
  let mejorBanca = 0;
  let mejorMuerto = 0;

  let volumenGeneral = 0;
  let volumenSentadilla = 0;
  let volumenBanca = 0;
  let volumenMuerto = 0;

  ultimosRegistros.innerHTML =
    "<h2>Últimos registros</h2>";

  if (registrosGlobales.length === 0) {
    limpiarValores();

    ultimosRegistros.innerHTML += `
      <p class="empty">
        Todavía no hay registros.
      </p>
    `;

    dibujarGraficaMaximos(
      ejercicioGrafica?.value || "Sentadilla"
    );

    return;
  }

  registrosGlobales.forEach((r) => {
    const volumen = Number(r.volumen) || 0;
    const maxpeso = Number(r.maxpeso) || 0;

    volumenGeneral += volumen;

    if (r.ejercicio === "Sentadilla") {
      volumenSentadilla += volumen;

      if (maxpeso > mejorSentadilla) {
        mejorSentadilla = maxpeso;
      }
    }

    if (r.ejercicio === "Press banca") {
      volumenBanca += volumen;

      if (maxpeso > mejorBanca) {
        mejorBanca = maxpeso;
      }
    }

    if (r.ejercicio === "Peso muerto") {
      volumenMuerto += volumen;

      if (maxpeso > mejorMuerto) {
        mejorMuerto = maxpeso;
      }
    }
  });

  registrosGlobales.slice(0, 8).forEach((r) => {
    ultimosRegistros.innerHTML += `
      <div class="exercise">
        <div>
          <h3>${r.ejercicio || "Ejercicio"}</h3>

          <p>
            ${r.series} series ·
            ${r.reps} reps ·
            ${r.peso} kg
          </p>

          <p>
            1RM estimado:
            ${Number(r.maxpeso).toFixed(1)} kg
          </p>

          <p>
            Volumen:
            ${Number(r.volumen).toFixed(1)} kg ·
            ${r.fecha || ""}
          </p>

          ${
            r.origen === "rutina"
              ? `<p>Rutina: ${r.nombreRutina}</p>`
              : ""
          }
        </div>
      </div>
    `;
  });

  prSentadilla.textContent =
    mejorSentadilla.toFixed(1);

  prBanca.textContent =
    mejorBanca.toFixed(1);

  prMuerto.textContent =
    mejorMuerto.toFixed(1);

  totalEntrenamientos.textContent =
    `${registrosGlobales.length} registros`;

  volumenTotal.textContent =
    `${volumenGeneral.toFixed(1)} kg`;

  volSentadilla.textContent =
    `${volumenSentadilla.toFixed(1)} kg`;

  volBanca.textContent =
    `${volumenBanca.toFixed(1)} kg`;

  volMuerto.textContent =
    `${volumenMuerto.toFixed(1)} kg`;

  dibujarGraficaMaximos(
    ejercicioGrafica?.value || "Sentadilla"
  );
}

/* =========================
   CALCULAR 1RM
========================= */

function calcular1RM(peso, reps) {
  if (peso <= 0 || reps <= 0) {
    return 0;
  }

  if (reps === 1) {
    return Number(peso.toFixed(1));
  }

  if (reps >= 37) {
    return 0;
  }

  const resultado =
    (peso * 36) / (37 - reps);

  return Number(resultado.toFixed(1));
}

/* =========================
   LIMPIAR VALORES
========================= */

function limpiarValores() {
  prSentadilla.textContent = "0.0";
  prBanca.textContent = "0.0";
  prMuerto.textContent = "0.0";

  totalEntrenamientos.textContent =
    "0 registros";

  volumenTotal.textContent =
    "0 kg";

  volSentadilla.textContent =
    "0 kg";

  volBanca.textContent =
    "0 kg";

  volMuerto.textContent =
    "0 kg";
}

/* =========================
   GRÁFICA
========================= */

function dibujarGraficaMaximos(ejercicioBuscado) {
  if (!ctx || !canvasGrafica) {
    return;
  }

  const datos = registrosGlobales
    .filter((registro) => {
      return (
        registro.ejercicio === ejercicioBuscado &&
        Number(registro.maxpeso) > 0
      );
    })
    .sort((a, b) => {
      return obtenerTiempo(a) - obtenerTiempo(b);
    });

  ctx.clearRect(
    0,
    0,
    canvasGrafica.width,
    canvasGrafica.height
  );

  ctx.fillStyle = "#334155";

  ctx.fillRect(
    0,
    0,
    canvasGrafica.width,
    canvasGrafica.height
  );

  if (datos.length === 0) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";

    ctx.fillText(
      "No hay datos para este ejercicio",
      canvasGrafica.width / 2,
      canvasGrafica.height / 2
    );

    ctx.textAlign = "start";
    return;
  }

  const paddingIzquierdo = 55;
  const paddingDerecho = 20;
  const paddingSuperior = 30;
  const paddingInferior = 45;

  const ancho =
    canvasGrafica.width -
    paddingIzquierdo -
    paddingDerecho;

  const alto =
    canvasGrafica.height -
    paddingSuperior -
    paddingInferior;

  const valores = datos.map((dato) =>
    Number(dato.maxpeso)
  );

  let minimo = Math.min(...valores);
  let maximo = Math.max(...valores);

  const margen = Math.max(
    (maximo - minimo) * 0.15,
    5
  );

  minimo = Math.max(0, minimo - margen);
  maximo += margen;

  const rango = maximo - minimo || 1;

  ctx.font = "11px Arial";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  const divisiones = 4;

  for (let i = 0; i <= divisiones; i++) {
    const porcentaje = i / divisiones;
    const y = paddingSuperior + porcentaje * alto;
    const valor = maximo - porcentaje * rango;

    ctx.strokeStyle =
      "rgba(148, 163, 184, 0.18)";

    ctx.beginPath();
    ctx.moveTo(paddingIzquierdo, y);

    ctx.lineTo(
      canvasGrafica.width - paddingDerecho,
      y
    );

    ctx.stroke();

    ctx.fillStyle = "#cbd5e1";

    ctx.fillText(
      `${valor.toFixed(1)} kg`,
      paddingIzquierdo - 7,
      y
    );
  }

  ctx.beginPath();

  datos.forEach((dato, indice) => {
    const x =
      datos.length === 1
        ? paddingIzquierdo + ancho / 2
        : paddingIzquierdo +
          (indice * ancho) /
          (datos.length - 1);

    const y =
      canvasGrafica.height -
      paddingInferior -
      ((Number(dato.maxpeso) - minimo) /
        rango) *
        alto;

    if (indice === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.strokeStyle = "#ef4444";
  ctx.lineWidth = 3;
  ctx.stroke();

  datos.forEach((dato, indice) => {
    const x =
      datos.length === 1
        ? paddingIzquierdo + ancho / 2
        : paddingIzquierdo +
          (indice * ancho) /
          (datos.length - 1);

    const y =
      canvasGrafica.height -
      paddingInferior -
      ((Number(dato.maxpeso) - minimo) /
        rango) *
        alto;

    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);

    ctx.fillStyle = "#ef4444";
    ctx.fill();

    ctx.fillStyle = "#f8fafc";
    ctx.font = "11px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";

    ctx.fillText(
      Number(dato.maxpeso).toFixed(1),
      x,
      y - 8
    );

    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px Arial";
    ctx.textBaseline = "top";

    ctx.fillText(
      obtenerFechaCorta(dato),
      x,
      canvasGrafica.height -
        paddingInferior +
        10
    );
  });

  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
}

/* =========================
   FECHAS
========================= */

function obtenerTiempo(registro) {
  if (registro.creado?.toMillis) {
    return registro.creado.toMillis();
  }

  if (registro.creado?.seconds) {
    return registro.creado.seconds * 1000;
  }

  if (registro.fecha) {
    const partes = registro.fecha.split("/");

    if (partes.length === 3) {
      const dia = Number(partes[0]);
      const mes = Number(partes[1]) - 1;
      const anio = Number(partes[2]);

      return new Date(anio, mes, dia).getTime();
    }
  }

  return 0;
}

function obtenerFechaCorta(registro) {
  if (registro.creado?.toDate) {
    return registro.creado
      .toDate()
      .toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "2-digit"
      });
  }

  if (registro.fecha) {
    const partes = registro.fecha.split("/");

    if (partes.length >= 2) {
      return `${partes[0]}/${partes[1]}`;
    }
  }

  return "";
}