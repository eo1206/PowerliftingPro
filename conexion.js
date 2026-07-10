const estadoConexion = document.getElementById("estadoConexion");

let temporizador = null;

function mostrarEstado(mensaje, clase) {
  if (!estadoConexion) return;

  estadoConexion.textContent = mensaje;
  estadoConexion.className = `estado-conexion ${clase}`;

  clearTimeout(temporizador);

  if (clase === "online") {
    temporizador = setTimeout(() => {
      estadoConexion.classList.add("hidden");
    }, 2500);
  }
}

function actualizarConexion() {
  if (navigator.onLine) {
    mostrarEstado("Conexión restaurada. Sincronizando…", "online");
  } else {
    mostrarEstado("Sin internet. Los datos se guardarán localmente.", "offline");
  }
}

window.addEventListener("online", actualizarConexion);
window.addEventListener("offline", actualizarConexion);

if (!navigator.onLine) {
  actualizarConexion();
}