import { auth, db, authPreparado } from "./firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { escaparHTML, numeroValido } from "./utils.js";

const elementos = {
  nombre: document.getElementById("nombreRutina"), ejercicio: document.getElementById("ejercicioRutina"),
  series: document.getElementById("seriesRutina"), reps: document.getElementById("repsRutina"),
  agregar: document.getElementById("agregarEjercicioRutina"), guardar: document.getElementById("guardarRutina"),
  vista: document.getElementById("vistaRutina")
};
let usuarioActual = null;
let ejercicios = [];

await authPreparado.catch(console.error);
onAuthStateChanged(auth, (user) => {
  usuarioActual = user;
  if (!user) window.location.replace("index.html");
});

elementos.agregar?.addEventListener("click", () => {
  const series = numeroValido(elementos.series.value);
  const repsObjetivo = numeroValido(elementos.reps.value);
  if (!series || !repsObjetivo) return alert("Completa series y reps con valores válidos");
  ejercicios.push({ ejercicio: elementos.ejercicio.value, series, repsObjetivo });
  elementos.series.value = "";
  elementos.reps.value = "";
  renderizar();
});

elementos.vista?.addEventListener("click", (event) => {
  const boton = event.target.closest(".temp-delete");
  if (!boton) return;
  ejercicios.splice(Number(boton.dataset.index), 1);
  renderizar();
});

elementos.guardar?.addEventListener("click", async () => {
  if (!usuarioActual) return alert("Abre la aplicación con internet al menos una vez e inicia sesión");
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
    alert(navigator.onLine ? "Rutina guardada" : "Rutina guardada localmente; se sincronizará al recuperar conexión");
  } catch (error) {
    console.error(error);
    alert("No se pudo guardar la rutina");
  }
});

function renderizar() {
  elementos.vista.innerHTML = `<h2>Vista previa</h2>${ejercicios.length ? ejercicios.map((item, index) => `
    <div class="exercise"><div><h3>${escaparHTML(item.ejercicio)}</h3><p>${item.series} series · ${item.repsObjetivo} reps objetivo</p></div>
    <button class="delete temp-delete" data-index="${index}" type="button" aria-label="Quitar ejercicio">×</button></div>`).join("") : '<p class="empty">Agrega ejercicios para crear tu rutina.</p>'}`;
}
