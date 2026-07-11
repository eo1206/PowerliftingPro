import { auth, db, authPreparado } from "./firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { escaparHTML, numeroValido } from "./utils.js";
import { CATALOGO_EJERCICIOS } from "./catalogo-ejercicios.js";

const ui = {
  nombre: document.getElementById("nombreRutina"),
  buscador: document.getElementById("buscadorEjercicio"),
  catalogo: document.getElementById("catalogoEjercicios"),
  seleccionadoTexto: document.getElementById("ejercicioSeleccionadoTexto"),
  series: document.getElementById("seriesRutina"),
  reps: document.getElementById("repsRutina"),
  agregar: document.getElementById("agregarEjercicioRutina"),
  guardar: document.getElementById("guardarRutina"),
  vista: document.getElementById("vistaRutina")
};

let usuarioActual = null;
let ejercicioSeleccionado = null;
let ejercicios = [];

await authPreparado.catch(console.error);
onAuthStateChanged(auth, (user) => {
  usuarioActual = user;
  if (!user) window.location.replace("index.html");
});

function normalizarBusqueda(texto) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function renderizarCatalogo() {
  const filtro = normalizarBusqueda(ui.buscador.value);
  const resultados = CATALOGO_EJERCICIOS.filter((item) => normalizarBusqueda(item.nombre).includes(filtro));

  ui.catalogo.innerHTML = resultados.length ? resultados.map((item) => `
    <button type="button" class="exercise-choice ${ejercicioSeleccionado?.nombre === item.nombre ? "selected" : ""}"
      data-ejercicio="${escaparHTML(item.nombre)}" role="option" aria-selected="${ejercicioSeleccionado?.nombre === item.nombre}">
      <span class="exercise-card-media">
        <img src="${escaparHTML(item.imagen)}" alt="" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false">
        <span class="exercise-choice-icon" ${item.imagen ? "hidden" : ""}>${escaparHTML(item.icono)}</span>
      </span>
      <span>${escaparHTML(item.nombre)}</span>
    </button>`).join("") : '<p class="empty catalog-empty">No se encontraron ejercicios.</p>';
}

ui.buscador.addEventListener("input", renderizarCatalogo);
ui.catalogo.addEventListener("click", (event) => {
  const boton = event.target.closest(".exercise-choice");
  if (!boton) return;
  ejercicioSeleccionado = CATALOGO_EJERCICIOS.find((item) => item.nombre === boton.dataset.ejercicio) || null;
  ui.seleccionadoTexto.textContent = ejercicioSeleccionado ? `Seleccionado: ${ejercicioSeleccionado.nombre}` : "Ningún ejercicio seleccionado";
  renderizarCatalogo();
});

ui.agregar.addEventListener("click", () => {
  const series = numeroValido(ui.series.value);
  const repsObjetivo = numeroValido(ui.reps.value);
  if (!ejercicioSeleccionado) return alert("Selecciona un ejercicio del catálogo");
  if (!series || series < 1 || series > 20) return alert("Las series deben estar entre 1 y 20");
  if (!repsObjetivo || repsObjetivo < 1 || repsObjetivo > 100) return alert("Las repeticiones deben estar entre 1 y 100");

  ejercicios.push({
    ejercicio: ejercicioSeleccionado.nombre,
    series,
    repsObjetivo,
    imagen: ejercicioSeleccionado.imagen,
    icono: ejercicioSeleccionado.icono
  });

  ui.series.value = "";
  ui.reps.value = "";
  ejercicioSeleccionado = null;
  ui.seleccionadoTexto.textContent = "Ningún ejercicio seleccionado";
  renderizarCatalogo();
  renderizarVista();
});

ui.vista.addEventListener("click", (event) => {
  const boton = event.target.closest(".temp-delete");
  if (!boton) return;
  ejercicios.splice(Number(boton.dataset.index), 1);
  renderizarVista();
});

ui.guardar.addEventListener("click", async () => {
  if (!usuarioActual) return alert("Inicia sesión primero");
  const nombre = ui.nombre.value.trim();
  if (!nombre) return alert("Escribe el nombre de la rutina");
  if (!ejercicios.length) return alert("Agrega mínimo un ejercicio");

  try {
    await addDoc(collection(db, "usuarios", usuarioActual.uid, "rutina"), {
      nombre,
      estado: "activa",
      ejercicios: ejercicios.map((item) => ({ ...item })),
      creado: serverTimestamp()
    });
    ui.nombre.value = "";
    ejercicios = [];
    renderizarVista();
    alert(navigator.onLine ? "Rutina guardada" : "Rutina guardada localmente; se sincronizará al volver la conexión");
  } catch (error) {
    console.error(error);
    alert("No se pudo guardar la rutina");
  }
});

function renderizarVista() {
  ui.vista.innerHTML = `<h2>Vista previa</h2>${ejercicios.length ? ejercicios.map((item, index) => `
    <article class="routine-preview">
      <div class="preview-media">
        <img src="${escaparHTML(item.imagen)}" alt="${escaparHTML(item.ejercicio)}" class="exercise-image" onerror="this.hidden=true;this.nextElementSibling.hidden=false">
        <div class="exercise-image placeholder" hidden>${escaparHTML(item.icono || item.ejercicio.slice(0, 2).toUpperCase())}</div>
      </div>
      <div class="routine-preview-info"><h3>${escaparHTML(item.ejercicio)}</h3><p>${item.series} series · ${item.repsObjetivo} reps objetivo</p></div>
      <button class="delete temp-delete" data-index="${index}" type="button" aria-label="Quitar ejercicio">×</button>
    </article>`).join("") : '<p class="empty">Agrega ejercicios para crear tu rutina.</p>'}`;
}

renderizarCatalogo();
renderizarVista();
