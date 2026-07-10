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

let registrosGlobales = [];
let usuarioActual = null;
let cancelarEscucha = null;

/* Cambiar la gráfica al seleccionar otro ejercicio */

ejercicioGrafica?.addEventListener("change", () => {
  dibujarGraficaMaximos(ejercicioGrafica.value);
});

/* Esperar a que Firebase restaure la sesión guardada */
let usuarioActual = null;

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
  cargarProgreso(user.uid);
});
/* Leer los registros de Firestore */

function cargarProgreso(uid) {
  if (cancelarEscucha) {
    cancelarEscucha();
  }

  const consulta = query(
    collection(db, "usuarios", uid, "registros"),
    orderBy("creado", "desc")
  );

  cancelarEscucha = onSnapshot(
    consulta,

    (snapshot) => {
      let mejorSentadilla = 0;
      let mejorBanca = 0;
      let mejorMuerto = 0;

      let volumenGeneral = 0;
      let volumenSentadilla = 0;
      let volumenBanca = 0;
      let volumenMuerto = 0;

      let cantidadRegistros = 0;

      registrosGlobales = [];

      ultimosRegistros.innerHTML =
        "<h2>Últimos registros</h2>";

      if (snapshot.empty) {
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

      snapshot.forEach((documento) => {
        const r = documento.data();

        registrosGlobales.push(r);

        cantidadRegistros++;

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

        if (cantidadRegistros <= 8) {
          ultimosRegistros.innerHTML += `
            <div class="exercise">
              <div>
                <h3>${r.ejercicio || "Ejercicio"}</h3>

                <p>
                  ${Number(r.series) || 0} series ·
                  ${Number(r.reps) || 0} reps ·
                  ${Number(r.peso) || 0} kg
                </p>

                <p>
                  1RM estimado:
                  ${maxpeso.toFixed(1)} kg
                </p>

                <p>
                  Volumen:
                  ${volumen.toFixed(1)} kg ·
                  ${r.fecha || ""}
                </p>
              </div>
            </div>
          `;
        }
      });

      prSentadilla.textContent =
        mejorSentadilla.toFixed(1);

      prBanca.textContent =
        mejorBanca.toFixed(1);

      prMuerto.textContent =
        mejorMuerto.toFixed(1);

      totalEntrenamientos.textContent =
        `${cantidadRegistros} registros`;

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
    },

    (error) => {
      console.error(
        "Error al cargar el progreso:",
        error
      );

      ultimosRegistros.innerHTML = `
        <h2>Últimos registros</h2>
        <p class="empty">
          No se pudieron cargar los registros.
        </p>
      `;
    }
  );
}

/* Reiniciar datos cuando no hay registros */

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

  registrosGlobales = [];
}

/* Dibujar gráfica manual */

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
  const paddingSuperior = 25;
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

  /*
    Se agrega margen para que la línea no quede
    pegada arriba o abajo.
  */

  const margen = Math.max(
    (maximo - minimo) * 0.15,
    5
  );

  minimo = Math.max(0, minimo - margen);
  maximo = maximo + margen;

  const rango = maximo - minimo || 1;

  /* Fondo */

  ctx.fillStyle = "#334155";

  ctx.fillRect(
    0,
    0,
    canvasGrafica.width,
    canvasGrafica.height
  );

  /* Líneas horizontales y valores del eje Y */

  ctx.font = "11px Arial";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  const divisiones = 4;

  for (let i = 0; i <= divisiones; i++) {
    const porcentaje = i / divisiones;

    const y =
      paddingSuperior +
      porcentaje * alto;

    const valor =
      maximo -
      porcentaje * rango;

    ctx.strokeStyle =
      "rgba(148, 163, 184, 0.18)";

    ctx.lineWidth = 1;

    ctx.beginPath();

    ctx.moveTo(
      paddingIzquierdo,
      y
    );

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

  /* Ejes */

  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 1;

  ctx.beginPath();

  ctx.moveTo(
    paddingIzquierdo,
    paddingSuperior
  );

  ctx.lineTo(
    paddingIzquierdo,
    canvasGrafica.height - paddingInferior
  );

  ctx.lineTo(
    canvasGrafica.width - paddingDerecho,
    canvasGrafica.height - paddingInferior
  );

  ctx.stroke();

  /* Línea del progreso */

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

  /* Puntos, valores y fechas */

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

    /* Punto */

    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);

    ctx.fillStyle = "#ef4444";
    ctx.fill();

    /* Valor de 1RM */

    ctx.fillStyle = "#f8fafc";
    ctx.font = "11px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";

    ctx.fillText(
      Number(dato.maxpeso).toFixed(1),
      x,
      y - 8
    );

    /* Fecha */

    const mostrarFecha =
      datos.length <= 6 ||
      indice === 0 ||
      indice === datos.length - 1 ||
      indice % Math.ceil(datos.length / 5) === 0;

    if (mostrarFecha) {
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
    }
  });

  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
}

/* Obtener fecha para ordenar */

function obtenerTiempo(registro) {
  if (registro.creado?.toMillis) {
    return registro.creado.toMillis();
  }

  if (registro.creado?.seconds) {
    return registro.creado.seconds * 1000;
  }

  if (registro.fecha) {
    const partes =
      registro.fecha.split("/");

    if (partes.length === 3) {
      const dia = Number(partes[0]);
      const mes = Number(partes[1]) - 1;
      const anio = Number(partes[2]);

      return new Date(
        anio,
        mes,
        dia
      ).getTime();
    }
  }

  return 0;
}

/* Obtener una fecha corta para el eje X */

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
    const partes =
      registro.fecha.split("/");

    if (partes.length >= 2) {
      return `${partes[0]}/${partes[1]}`;
    }

    return registro.fecha;
  }

  return "";
}