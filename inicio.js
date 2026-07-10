import { auth, db, authPreparado } from "./firebase.js";

import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const form = document.getElementById("trainingForm");
const lista = document.getElementById("listaRegistros");

const prSentadillaElemento = document.getElementById("prSentadilla");
const prBancaElemento = document.getElementById("prBanca");
const prMuertoElemento = document.getElementById("prMuerto");

let usuarioActual = null;
let cancelarEscucha = null;

/* Esperar que Firebase restaure la sesión guardada */

try {
  await authPreparado;
} catch (error) {
  console.error("No se pudo restaurar la sesión:", error);
}

/* Detectar al usuario */

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    usuarioActual = null;

    if (cancelarEscucha) {
      cancelarEscucha();
      cancelarEscucha = null;
    }

    return;
  }

  usuarioActual = user;

  await cargarRegistros(user.uid);
  await actualizarPRs();
});

/* Calcular 1RM estimado mediante Brzycki */

function calcular1RM(peso, reps) {
  if (reps === 1) {
    return Number(peso.toFixed(1));
  }

  if (reps >= 37) {
    return 0;
  }

  const resultado = (peso * 36) / (37 - reps);

  return Number(resultado.toFixed(1));
}

/* Buscar el máximo 1RM de un ejercicio */

async function obtenerMaximoPorEjercicio(ejercicioBuscado) {
  if (!usuarioActual) {
    return 0;
  }

  const consulta = query(
    collection(
      db,
      "usuarios",
      usuarioActual.uid,
      "registros"
    ),
    where("ejercicio", "==", ejercicioBuscado)
  );

  try {
    const resultados = await getDocs(consulta);

    let maximo = 0;

    resultados.forEach((documento) => {
      const datos = documento.data();
      const valor = Number(datos.maxpeso) || 0;

      if (valor > maximo) {
        maximo = valor;
      }
    });

    return maximo;
  } catch (error) {
    console.error(
      `No se pudo obtener el máximo de ${ejercicioBuscado}:`,
      error
    );

    return 0;
  }
}

/* Mostrar los tres PR en el HTML */

async function actualizarPRs() {
  if (!usuarioActual) {
    return;
  }

  try {
    const [
      maxSentadilla,
      maxBanca,
      maxMuerto
    ] = await Promise.all([
      obtenerMaximoPorEjercicio("Sentadilla"),
      obtenerMaximoPorEjercicio("Press banca"),
      obtenerMaximoPorEjercicio("Peso muerto")
    ]);

    if (prSentadillaElemento) {
      prSentadillaElemento.textContent =
        maxSentadilla.toFixed(1);
    }

    if (prBancaElemento) {
      prBancaElemento.textContent =
        maxBanca.toFixed(1);
    }

    if (prMuertoElemento) {
      prMuertoElemento.textContent =
        maxMuerto.toFixed(1);
    }
  } catch (error) {
    console.error("No se pudieron actualizar los PR:", error);
  }
}

/* Guardar un entrenamiento */

form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!usuarioActual) {
    alert("Primero inicia sesión");
    return;
  }

  const ejercicio =
    document.getElementById("exercise").value;

  const peso =
    Number(document.getElementById("peso").value);

  const reps =
    Number(document.getElementById("reps").value);

  const series =
    Number(document.getElementById("series").value);

  const rpe =
    Number(document.getElementById("rpe").value) || 0;

  const notas =
    document.getElementById("notas").value.trim();

  if (peso <= 0 || reps <= 0 || series <= 0) {
    alert("Completa peso, reps y series con valores válidos");
    return;
  }

  if (reps >= 37) {
    alert("Las repeticiones deben ser menores de 37");
    return;
  }

  const maxpeso = calcular1RM(peso, reps);
  const volumen = peso * reps * series;

  try {
    const maximoAnterior =
      await obtenerMaximoPorEjercicio(ejercicio);

    const esPR = maxpeso > maximoAnterior;

    await addDoc(
      collection(
        db,
        "usuarios",
        usuarioActual.uid,
        "registros"
      ),
      {
        ejercicio,
        peso,
        reps,
        series,
        rpe,
        notas,
        volumen,
        maxpeso,
        esPR,
        fecha: new Date().toLocaleDateString("es-MX"),
        creado: serverTimestamp()
      }
    );

    form.reset();

    await actualizarPRs();
  } catch (error) {
    console.error("No se pudo guardar el registro:", error);

    alert(
      `${error.code || "Error"}: ${error.message}`
    );
  }
});

/* Leer registros al abrir y escuchar cambios */

async function cargarRegistros(uid) {
  if (!lista) {
    console.error(
      "No existe el elemento #listaRegistros en el HTML"
    );
    return;
  }

  if (cancelarEscucha) {
    cancelarEscucha();
    cancelarEscucha = null;
  }

  const consulta = query(
    collection(db, "usuarios", uid, "registros"),
    orderBy("creado", "desc")
  );

  try {
    /*
      Lectura inicial para mostrar los registros
      inmediatamente al abrir la aplicación.
    */

    const snapshotInicial = await getDocs(consulta);

    mostrarRegistros(snapshotInicial, uid);

    /*
      Escuchar nuevos registros, eliminaciones
      o modificaciones en tiempo real.
    */

    cancelarEscucha = onSnapshot(
      consulta,

      async (snapshot) => {
        mostrarRegistros(snapshot, uid);
        await actualizarPRs();
      },

      (error) => {
        console.error(
          "Error al escuchar registros:",
          error
        );
      }
    );
  } catch (error) {
    console.error("Error al cargar registros:", error);

    lista.innerHTML = `
      <h2>Últimos registros</h2>
      <p class="empty">
        No se pudieron cargar los registros.
      </p>
    `;
  }
}

/* Dibujar registros en el HTML */

function mostrarRegistros(snapshot, uid) {
  if (!lista) {
    return;
  }

  lista.innerHTML = "<h2>Últimos registros</h2>";

  if (snapshot.empty) {
    lista.innerHTML += `
      <p class="empty">
        Todavía no hay registros.
      </p>
    `;

    return;
  }

  snapshot.forEach((documento) => {
    const r = documento.data();

    const maxpesoMostrar =
      Number(r.maxpeso || 0).toFixed(1);

    const volumenMostrar =
      Number(r.volumen || 0).toFixed(1);

    lista.innerHTML += `
      <div class="exercise">
        <div>
          <h3>
            ${r.ejercicio || "Ejercicio"}
            ${r.esPR ? "🏆" : ""}
          </h3>

          <p>
            ${Number(r.series) || 0} series ·
            ${Number(r.reps) || 0} reps ·
            ${Number(r.peso) || 0} kg
          </p>

          <p>
            1RM estimado:
            ${maxpesoMostrar} kg
          </p>

          <p>
            ${
              r.esPR
                ? "🏆 Nuevo PR"
                : "No es PR"
            }
          </p>

          <p>
            Volumen:
            ${volumenMostrar} kg ·
            ${r.fecha || ""}
          </p>

          ${
            r.notas
              ? `<p>Nota: ${r.notas}</p>`
              : ""
          }
        </div>

        <div class="right">
          <span>
            RPE ${Number(r.rpe) || "-"}
          </span>

          <button
            class="delete"
            data-id="${documento.id}"
            type="button"
            aria-label="Eliminar registro"
          >
            ×
          </button>
        </div>
      </div>
    `;
  });

  /* Asignar eventos a los botones de eliminar */

  lista.querySelectorAll(".delete").forEach((boton) => {
    boton.addEventListener("click", async () => {
      const idRegistro = boton.dataset.id;

      const confirmar = confirm(
        "¿Quieres eliminar este registro?"
      );

      if (!confirmar) {
        return;
      }

      try {
        await deleteDoc(
          doc(
            db,
            "usuarios",
            uid,
            "registros",
            idRegistro
          )
        );

        /*
          onSnapshot actualiza automáticamente
          la lista y los PR después de eliminar.
        */
      } catch (error) {
        console.error(
          "No se pudo eliminar el registro:",
          error
        );

        alert("No se pudo eliminar el registro");
      }
    });
  });
}