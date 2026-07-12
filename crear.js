import { auth, db, authPreparado } from "./firebase.js";
import {
  collection, addDoc, serverTimestamp, query, orderBy, onSnapshot,
  doc, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { escaparHTML, numeroValido } from "./utils.js";
import { CATALOGO_EJERCICIOS, GRUPOS_MUSCULARES, buscarEjercicio } from "./catalogo-ejercicios.js";

const $ = (id) => document.getElementById(id);
const ui = {
  tabRutinas: $("tabRutinas"), tabCrear: $("tabCrear"), panelRutinas: $("panelRutinas"), panelCrear: $("panelCrear"),
  irACrear: $("irACrear"), listaRutinas: $("listaRutinasEditables"), editor: $("editorRutina"), cerrarEditor: $("cerrarEditor"),
  nombreEditar: $("nombreRutinaEditar"), ejerciciosEditor: $("ejerciciosEditor"), buscadorEditor: $("buscadorEditor"), catalogoEditor: $("catalogoEditor"),
  guardarCambios: $("guardarCambiosRutina"), eliminar: $("eliminarRutina"),
  nombre: $("nombreRutina"), buscador: $("buscadorEjercicio"), catalogo: $("catalogoEjercicios"),
  seleccionadoTexto: $("ejercicioSeleccionadoTexto"), config: $("configuracionEjercicio"), series: $("seriesRutina"), reps: $("repsRutina"),
  seriesPlanificadas: $("seriesPlanificadas"), agregar: $("agregarEjercicioRutina"), guardar: $("guardarRutina"), vista: $("vistaRutina")
};

let usuarioActual = null;
let cancelarRutinas = null;
let rutinasGuardadas = [];
let rutinaEditada = null;
let ejercicioSeleccionado = null;
let ejerciciosNuevos = [];

await authPreparado.catch(console.error);
onAuthStateChanged(auth, (user) => {
  cancelarRutinas?.();
  usuarioActual = user;
  if (!user) return window.location.replace("index.html");
  escucharRutinas(user.uid);
});

function mostrarPanel(nombre) {
  const crear = nombre === "crear";
  ui.panelCrear.classList.toggle("hidden", !crear);
  ui.panelRutinas.classList.toggle("hidden", crear);
  ui.tabCrear.classList.toggle("active", crear);
  ui.tabRutinas.classList.toggle("active", !crear);
}

ui.tabRutinas.addEventListener("click", () => mostrarPanel("rutinas"));
ui.tabCrear.addEventListener("click", () => mostrarPanel("crear"));
ui.irACrear.addEventListener("click", () => mostrarPanel("crear"));
ui.cerrarEditor.addEventListener("click", () => { ui.editor.classList.add("hidden"); rutinaEditada = null; });

function escucharRutinas(uid) {
  const consulta = query(collection(db, "usuarios", uid, "rutina"), orderBy("creado", "desc"));
  cancelarRutinas = onSnapshot(consulta, (snapshot) => {
    rutinasGuardadas = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderizarListaRutinas();
    if (rutinaEditada) {
      const actualizada = rutinasGuardadas.find((r) => r.id === rutinaEditada.id);
      if (actualizada) { rutinaEditada = clonarRutina(actualizada); renderizarEditor(); }
    }
  }, (error) => console.error("Error al cargar rutinas:", error));
}

function clonarRutina(rutina) {
  return {
    ...rutina,
    ejercicios: (Array.isArray(rutina.ejercicios) ? rutina.ejercicios : []).map(normalizarEjercicio)
  };
}

function normalizarEjercicio(item) {
  const cantidad = Math.max(1, Number(item.series) || (Array.isArray(item.seriesPlan) ? item.seriesPlan.length : 1));
  const repsBase = Math.max(1, Number(item.repsObjetivo) || 1);
  const existentes = Array.isArray(item.seriesPlan) ? item.seriesPlan : [];
  return {
    ejercicio: item.ejercicio || "Ejercicio",
    grupo: item.grupo || buscarEjercicio(item.ejercicio)?.grupo || "Otros",
    imagen: item.imagen || buscarEjercicio(item.ejercicio)?.imagen || "",
    icono: item.icono || buscarEjercicio(item.ejercicio)?.icono || "EX",
    series: cantidad,
    repsObjetivo: repsBase,
    seriesPlan: Array.from({ length: cantidad }, (_, i) => ({
      reps: Math.max(1, Number(existentes[i]?.reps) || repsBase),
      porcentaje1RM: limitarPorcentaje(existentes[i]?.porcentaje1RM ?? item.porcentaje1RM ?? 70)
    }))
  };
}

function limitarPorcentaje(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? Math.min(150, Math.max(0, numero)) : 70;
}

function normalizarBusqueda(texto) {
  return String(texto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function catalogoAgrupado(filtro, modo) {
  const busqueda = normalizarBusqueda(filtro);
  const grupos = GRUPOS_MUSCULARES.map((grupo) => ({
    grupo,
    items: CATALOGO_EJERCICIOS.filter((item) => {
      const texto = normalizarBusqueda(`${item.nombre} ${item.grupo}`);
      return item.grupo === grupo && texto.includes(busqueda);
    })
  })).filter((seccion) => seccion.items.length);

  if (!grupos.length) return '<p class="empty">No se encontraron ejercicios.</p>';

  return grupos.map((seccion, index) => `
    <details class="muscle-group" ${busqueda || index === 0 ? "open" : ""}>
      <summary><span>${escaparHTML(seccion.grupo)}</span><small>${seccion.items.length}</small></summary>
      <div class="muscle-exercise-grid">
        ${seccion.items.map((item) => `
          <button type="button" class="exercise-choice" data-modo="${modo}" data-ejercicio="${escaparHTML(item.nombre)}">
            <span class="exercise-card-media">
              <img src="${escaparHTML(item.imagen)}" alt="" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false">
              <span class="exercise-choice-icon" hidden>${escaparHTML(item.icono)}</span>
            </span>
            <span>${escaparHTML(item.nombre)}</span>
          </button>`).join("")}
      </div>
    </details>`).join("");
}

function renderizarCatalogoCrear() { ui.catalogo.innerHTML = catalogoAgrupado(ui.buscador.value, "crear"); }
function renderizarCatalogoEditor() { ui.catalogoEditor.innerHTML = catalogoAgrupado(ui.buscadorEditor.value, "editar"); }
ui.buscador.addEventListener("input", renderizarCatalogoCrear);
ui.buscadorEditor.addEventListener("input", renderizarCatalogoEditor);

function seleccionarEjercicio(nombre) {
  ejercicioSeleccionado = buscarEjercicio(nombre);
  if (!ejercicioSeleccionado) return;
  ui.seleccionadoTexto.textContent = `Seleccionado: ${ejercicioSeleccionado.nombre}`;
  ui.config.classList.remove("hidden");
  renderizarSeriesPlanificadas();
  ui.config.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

ui.catalogo.addEventListener("click", (event) => {
  const boton = event.target.closest(".exercise-choice");
  if (boton) seleccionarEjercicio(boton.dataset.ejercicio);
});

ui.catalogoEditor.addEventListener("click", (event) => {
  const boton = event.target.closest(".exercise-choice");
  if (!boton || !rutinaEditada) return;
  const item = buscarEjercicio(boton.dataset.ejercicio);
  if (!item) return;
  rutinaEditada.ejercicios.push(normalizarEjercicio({ ...item, ejercicio: item.nombre, series: 3, repsObjetivo: 8 }));
  renderizarEditor();
});

ui.series.addEventListener("input", renderizarSeriesPlanificadas);
ui.reps.addEventListener("input", renderizarSeriesPlanificadas);

function renderizarSeriesPlanificadas() {
  const cantidad = Math.min(20, Math.max(1, numeroValido(ui.series.value) || 1));
  const reps = Math.min(100, Math.max(1, numeroValido(ui.reps.value) || 1));
  const previos = [...ui.seriesPlanificadas.querySelectorAll(".planned-series")].map((fila) => ({
    reps: fila.querySelector("[data-campo='reps']")?.value,
    porcentaje1RM: fila.querySelector("[data-campo='porcentaje']")?.value
  }));
  ui.seriesPlanificadas.innerHTML = `<div class="planned-series-list">${Array.from({ length: cantidad }, (_, i) => `
    <div class="planned-series">
      <strong>Serie ${i + 1}</strong>
      <label>Reps<input data-campo="reps" type="number" min="1" max="100" value="${previos[i]?.reps || reps}"></label>
      <label>% 1RM<input data-campo="porcentaje" type="number" min="0" max="150" step="1" value="${previos[i]?.porcentaje1RM || 70}"></label>
    </div>`).join("")}</div>`;
}

function leerSeriesPlanificadas(contenedor) {
  return [...contenedor.querySelectorAll(".planned-series")].map((fila) => ({
    reps: Math.max(1, Number(fila.querySelector("[data-campo='reps']")?.value) || 1),
    porcentaje1RM: limitarPorcentaje(fila.querySelector("[data-campo='porcentaje']")?.value)
  }));
}

ui.agregar.addEventListener("click", () => {
  if (!ejercicioSeleccionado) return alert("Selecciona un ejercicio");
  const seriesPlan = leerSeriesPlanificadas(ui.seriesPlanificadas);
  if (!seriesPlan.length) return alert("Agrega al menos una serie");
  ejerciciosNuevos.push(normalizarEjercicio({
    ejercicio: ejercicioSeleccionado.nombre,
    grupo: ejercicioSeleccionado.grupo,
    imagen: ejercicioSeleccionado.imagen,
    icono: ejercicioSeleccionado.icono,
    series: seriesPlan.length,
    repsObjetivo: seriesPlan[0].reps,
    seriesPlan
  }));
  ejercicioSeleccionado = null;
  ui.config.classList.add("hidden");
  ui.seleccionadoTexto.textContent = "Selecciona un ejercicio";
  renderizarVista();
});

function resumenSeries(item) {
  return item.seriesPlan.map((serie, i) => `<span>S${i + 1}: ${serie.reps} reps · ${serie.porcentaje1RM}% 1RM</span>`).join("");
}

function renderizarVista() {
  ui.vista.innerHTML = `<h2>Vista previa</h2>${ejerciciosNuevos.length ? ejerciciosNuevos.map((item, index) => `
    <article class="routine-preview">
      <div class="preview-media"><img src="${escaparHTML(item.imagen)}" alt="" class="exercise-image" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><div class="exercise-image placeholder" hidden>${escaparHTML(item.icono)}</div></div>
      <div class="routine-preview-info"><h3>${escaparHTML(item.ejercicio)}</h3><p>${item.series} series</p><div class="series-summary">${resumenSeries(item)}</div></div>
      <button class="delete temp-delete" data-index="${index}" type="button" aria-label="Quitar ejercicio">×</button>
    </article>`).join("") : '<p class="empty">Agrega ejercicios para crear tu rutina.</p>'}`;
}

ui.vista.addEventListener("click", (event) => {
  const boton = event.target.closest(".temp-delete");
  if (!boton) return;
  ejerciciosNuevos.splice(Number(boton.dataset.index), 1);
  renderizarVista();
});

ui.guardar.addEventListener("click", async () => {
  if (!usuarioActual) return alert("Inicia sesión primero");
  const nombre = ui.nombre.value.trim();
  if (!nombre) return alert("Escribe el nombre de la rutina");
  if (!ejerciciosNuevos.length) return alert("Agrega mínimo un ejercicio");
  try {
    await addDoc(collection(db, "usuarios", usuarioActual.uid, "rutina"), {
      nombre, estado: "activa", ejercicios: ejerciciosNuevos, creado: serverTimestamp(), actualizado: serverTimestamp()
    });
    ui.nombre.value = "";
    ejerciciosNuevos = [];
    renderizarVista();
    mostrarPanel("rutinas");
    alert("Rutina guardada");
  } catch (error) { console.error(error); alert("No se pudo guardar la rutina"); }
});

function renderizarListaRutinas() {
  ui.listaRutinas.innerHTML = rutinasGuardadas.length ? rutinasGuardadas.map((rutina) => `
    <article class="editable-routine-card">
      <div><h3>${escaparHTML(rutina.nombre || "Rutina")}</h3><p>${Array.isArray(rutina.ejercicios) ? rutina.ejercicios.length : 0} ejercicios</p></div>
      <button class="edit-routine-button" data-id="${rutina.id}" type="button">Editar</button>
    </article>`).join("") : '<p class="empty">Todavía no tienes rutinas guardadas.</p>';
}

ui.listaRutinas.addEventListener("click", (event) => {
  const boton = event.target.closest(".edit-routine-button");
  if (!boton) return;
  const encontrada = rutinasGuardadas.find((r) => r.id === boton.dataset.id);
  if (!encontrada) return;
  rutinaEditada = clonarRutina(encontrada);
  ui.editor.classList.remove("hidden");
  renderizarEditor();
  ui.editor.scrollIntoView({ behavior: "smooth", block: "start" });
});

function renderizarEditor() {
  if (!rutinaEditada) return;
  ui.nombreEditar.value = rutinaEditada.nombre || "";
  ui.ejerciciosEditor.innerHTML = rutinaEditada.ejercicios.length ? rutinaEditada.ejercicios.map((item, indice) => `
    <article class="edit-exercise-card" data-index="${indice}">
      <div class="edit-exercise-head"><div><p class="label">${escaparHTML(item.grupo)}</p><h3>${escaparHTML(item.ejercicio)}</h3></div><button class="delete-editor-exercise" data-index="${indice}" type="button">×</button></div>
      <div class="planned-series-list">${item.seriesPlan.map((serie, serieIndex) => `
        <div class="planned-series" data-serie="${serieIndex}">
          <strong>Serie ${serieIndex + 1}</strong>
          <label>Reps<input data-campo="reps" type="number" min="1" max="100" value="${serie.reps}"></label>
          <label>% 1RM<input data-campo="porcentaje" type="number" min="0" max="150" value="${serie.porcentaje1RM}"></label>
          <button class="remove-series" type="button" aria-label="Quitar serie">−</button>
        </div>`).join("")}</div>
      <button class="add-series secondary-button" data-index="${indice}" type="button">+ Agregar serie</button>
    </article>`).join("") : '<p class="empty">Esta rutina no tiene ejercicios.</p>';
  renderizarCatalogoEditor();
}

ui.ejerciciosEditor.addEventListener("input", (event) => {
  const tarjeta = event.target.closest(".edit-exercise-card");
  const serie = event.target.closest(".planned-series");
  if (!tarjeta || !serie || !rutinaEditada) return;
  const item = rutinaEditada.ejercicios[Number(tarjeta.dataset.index)];
  const plan = item.seriesPlan[Number(serie.dataset.serie)];
  if (event.target.dataset.campo === "reps") plan.reps = Math.max(1, Number(event.target.value) || 1);
  if (event.target.dataset.campo === "porcentaje") plan.porcentaje1RM = limitarPorcentaje(event.target.value);
  item.series = item.seriesPlan.length;
  item.repsObjetivo = item.seriesPlan[0]?.reps || 1;
});

ui.ejerciciosEditor.addEventListener("click", (event) => {
  if (!rutinaEditada) return;
  const tarjeta = event.target.closest(".edit-exercise-card");
  const indice = Number(tarjeta?.dataset.index);
  if (event.target.closest(".delete-editor-exercise")) rutinaEditada.ejercicios.splice(indice, 1);
  else if (event.target.closest(".add-series")) rutinaEditada.ejercicios[indice].seriesPlan.push({ reps: 8, porcentaje1RM: 70 });
  else if (event.target.closest(".remove-series")) {
    const serie = Number(event.target.closest(".planned-series").dataset.serie);
    if (rutinaEditada.ejercicios[indice].seriesPlan.length <= 1) return alert("El ejercicio debe tener al menos una serie");
    rutinaEditada.ejercicios[indice].seriesPlan.splice(serie, 1);
  } else return;
  rutinaEditada.ejercicios.forEach((item) => { item.series = item.seriesPlan.length; item.repsObjetivo = item.seriesPlan[0]?.reps || 1; });
  renderizarEditor();
});

ui.guardarCambios.addEventListener("click", async () => {
  if (!usuarioActual || !rutinaEditada) return;
  const nombre = ui.nombreEditar.value.trim();
  if (!nombre) return alert("La rutina necesita un nombre");
  if (!rutinaEditada.ejercicios.length) return alert("La rutina necesita al menos un ejercicio");
  rutinaEditada.ejercicios.forEach((item) => { item.series = item.seriesPlan.length; item.repsObjetivo = item.seriesPlan[0]?.reps || 1; });
  try {
    await updateDoc(doc(db, "usuarios", usuarioActual.uid, "rutina", rutinaEditada.id), {
      nombre, ejercicios: rutinaEditada.ejercicios, actualizado: serverTimestamp()
    });
    alert("Modificación guardada");
  } catch (error) { console.error(error); alert("No se pudo modificar la rutina"); }
});

ui.eliminar.addEventListener("click", async () => {
  if (!usuarioActual || !rutinaEditada) return;
  const confirmar = await window.confirmarApp?.("Esta acción eliminará la rutina completa.", "Eliminar rutina");
  if (confirmar === false) return;
  if (confirmar == null && !confirm("¿Eliminar esta rutina?")) return;
  try {
    await deleteDoc(doc(db, "usuarios", usuarioActual.uid, "rutina", rutinaEditada.id));
    rutinaEditada = null;
    ui.editor.classList.add("hidden");
    alert("Rutina eliminada");
  } catch (error) { console.error(error); alert("No se pudo eliminar la rutina"); }
});

renderizarCatalogoCrear();
renderizarCatalogoEditor();
renderizarSeriesPlanificadas();
renderizarVista();
