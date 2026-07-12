import { auth, db, authPreparado } from "./firebase.js";
import { collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { escaparHTML } from "./utils.js";

const loading = document.getElementById("loadingScreen");
const app = document.getElementById("appProtegida");
const lista = document.getElementById("listaRanking");
const orden = document.getElementById("ordenRanking");
let usuarios = [];

await authPreparado.catch(console.error);
onAuthStateChanged(auth, (user) => {
  if (!user) return window.location.replace("index.html");
  app.classList.remove("hidden");
  loading.classList.add("hidden");
  escucharRanking();
});

function escucharRanking() {
  const consulta = query(collection(db, "ranking"), orderBy("total", "desc"));
  onSnapshot(consulta, (snapshot) => {
    usuarios = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })).filter((u) => u.privacidad !== "oculto");
    renderizar();
  }, (error) => {
    console.error(error);
    lista.innerHTML = '<p class="empty">No se pudo cargar el ranking. Revisa las reglas de Firestore para permitir leer la colección ranking.</p>';
  });
}

orden.addEventListener("change", renderizar);

function renderizar() {
  const campo = orden.value;
  const ordenados = [...usuarios].sort((a, b) => (Number(b[campo]) || 0) - (Number(a[campo]) || 0));
  lista.innerHTML = ordenados.length ? ordenados.map((u, i) => `
    <article class="ranking-row ${i < 3 ? `top-${i + 1}` : ""}">
      <span class="ranking-position">${i + 1}</span>
      <div class="ranking-user"><strong>${escaparHTML(u.privacidad === "anonimo" ? "Usuario anónimo" : (u.nickname || u.nombre || "Usuario"))}</strong><small>Total: ${(Number(u.total) || 0).toFixed(1)} kg</small></div>
      <div class="ranking-lifts"><span>S ${(Number(u.sentadilla) || 0).toFixed(1)}</span><span>B ${(Number(u.banca) || 0).toFixed(1)}</span><span>M ${(Number(u.muerto) || 0).toFixed(1)}</span></div>
      <strong class="ranking-score">${(Number(u[campo]) || 0).toFixed(1)} kg</strong>
    </article>`).join("") : '<p class="empty">Todavía no hay usuarios en el ranking. Abre Inicio para publicar tus PR.</p>';
}
