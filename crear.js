import { auth, db, authPreparado } from "./firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { escaparHTML, numeroValido } from "./utils.js";

const elementos = {
  nombre: document.getElementById("nombreRutina"), ejercicio: document.getElementById("ejercicioRutina"),
  series: document.getElementById("seriesRutina"), reps: document.getElementById("repsRutina"),
  imagen: document.getElementById("imagenEjercicio"), imagenUrl: document.getElementById("imagenUrl"),
  agregar: document.getElementById("agregarEjercicioRutina"), guardar: document.getElementById("guardarRutina"),
  vista: document.getElementById("vistaRutina"), catalogo: document.getElementById("catalogoEjercicios")
};

const catalogo = ["Sentadilla", "Press banca", "Peso muerto", "Press militar", "Remo", "Dominadas", "Fondos", "Hip thrust", "Curl bíceps", "Extensión tríceps"];
let usuarioActual = null;
let ejercicios = [];

await authPreparado.catch(console.error);
onAuthStateChanged(auth, (user) => {
  usuarioActual = user;
  if (!user) window.location.replace("index.html");
});

function renderizarCatalogo() {
  elementos.catalogo.innerHTML = catalogo.map((nombre) => `
    <button type="button" class="exercise-choice ${elementos.ejercicio.value === nombre ? "selected" : ""}" data-ejercicio="${escaparHTML(nombre)}">
      <span class="exercise-choice-icon">${nombre.split(" ").map(p => p[0]).join("").slice(0, 2)}</span>
      <span>${escaparHTML(nombre)}</span>
    </button>`).join("");
}

elementos.catalogo.addEventListener("click", (event) => {
  const boton = event.target.closest(".exercise-choice");
  if (!boton) return;
  elementos.ejercicio.value = boton.dataset.ejercicio;
  renderizarCatalogo();
});

elementos.ejercicio.addEventListener("change", renderizarCatalogo);

async function archivoAImagenReducida(archivo) {
  if (!archivo) return "";
  if (!archivo.type.startsWith("image/")) throw new Error("El archivo debe ser una imagen");
  if (archivo.size > 8 * 1024 * 1024) throw new Error("La imagen supera 8 MB");

  const dataUrl = await new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(lector.result);
    lector.onerror = reject;
    lector.readAsDataURL(archivo);
  });

  const imagen = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });

  const max = 420;
  const escala = Math.min(1, max / Math.max(imagen.width, imagen.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(imagen.width * escala));
  canvas.height = Math.max(1, Math.round(imagen.height * escala));
  canvas.getContext("2d").drawImage(imagen, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.60);
}

elementos.agregar.addEventListener("click", async () => {
  const series = numeroValido(elementos.series.value);
  const repsObjetivo = numeroValido(elementos.reps.value);
  if (!series || !repsObjetivo) return alert("Completa series y reps con valores válidos");

  try {
    const archivo = elementos.imagen.files?.[0];
    const imagen = archivo ? await archivoAImagenReducida(archivo) : elementos.imagenUrl.value.trim();
    ejercicios.push({ ejercicio: elementos.ejercicio.value, series, repsObjetivo, imagen });
    elementos.series.value = "";
    elementos.reps.value = "";
    elementos.imagen.value = "";
    elementos.imagenUrl.value = "";
    renderizar();
  } catch (error) {
    console.error(error);
    alert(error.message || "No se pudo procesar la imagen");
  }
});

elementos.vista.addEventListener("click", (event) => {
  const boton = event.target.closest(".temp-delete");
  if (!boton) return;
  ejercicios.splice(Number(boton.dataset.index), 1);
  renderizar();
});

elementos.guardar.addEventListener("click", async () => {
  if (!usuarioActual) return alert("Inicia sesión primero");
  const nombre = elementos.nombre.value.trim();
  if (!nombre) return alert("Escribe el nombre de la rutina");
  if (!ejercicios.length) return alert("Agrega mínimo un ejercicio");

  try {
    await addDoc(collection(db, "usuarios", usuarioActual.uid, "rutina"), {
      nombre, estado: "activa", ejercicios: structuredClone(ejercicios), creado: serverTimestamp()
    });
    elementos.nombre.value = "";
    ejercicios = [];
    renderizar();
    alert(navigator.onLine ? "Rutina guardada" : "Rutina guardada localmente; se sincronizará cuando regrese la conexión");
  } catch (error) {
    console.error(error);
    alert("No se pudo guardar la rutina");
  }
});

function renderizar() {
  elementos.vista.innerHTML = `<h2>Vista previa</h2>${ejercicios.length ? ejercicios.map((item, index) => `
    <article class="routine-preview">
      ${item.imagen ? `<img src="${escaparHTML(item.imagen)}" alt="${escaparHTML(item.ejercicio)}" class="exercise-image">` : `<div class="exercise-image placeholder">${escaparHTML(item.ejercicio.slice(0, 2).toUpperCase())}</div>`}
      <div class="routine-preview-info"><h3>${escaparHTML(item.ejercicio)}</h3><p>${item.series} series · ${item.repsObjetivo} reps objetivo</p></div>
      <button class="delete temp-delete" data-index="${index}" type="button" aria-label="Quitar ejercicio">×</button>
    </article>`).join("") : '<p class="empty">Agrega ejercicios para crear tu rutina.</p>'}`;
}

renderizarCatalogo();
renderizar();
