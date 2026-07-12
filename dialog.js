(() => {
  let dialogo = null;
  let resolver = null;

  function crearDialogo() {
    if (dialogo) return dialogo;

    dialogo = document.createElement("dialog");
    dialogo.className = "app-dialog";
    dialogo.innerHTML = `
      <form method="dialog" class="app-dialog-card">
        <div class="app-dialog-icon" aria-hidden="true">!</div>
        <div class="app-dialog-copy">
          <h2 id="appDialogTitulo">Aviso</h2>
          <p id="appDialogMensaje"></p>
        </div>
        <div class="app-dialog-actions">
          <button id="appDialogCancelar" class="dialog-secondary hidden" type="button">Cancelar</button>
          <button id="appDialogAceptar" type="button">Aceptar</button>
        </div>
      </form>`;

    document.body.appendChild(dialogo);

    const aceptar = dialogo.querySelector("#appDialogAceptar");
    const cancelar = dialogo.querySelector("#appDialogCancelar");

    aceptar.addEventListener("click", () => cerrar(true));
    cancelar.addEventListener("click", () => cerrar(false));
    dialogo.addEventListener("cancel", (event) => {
      event.preventDefault();
      cerrar(false);
    });

    dialogo.addEventListener("click", (event) => {
      if (event.target === dialogo) cerrar(false);
    });

    return dialogo;
  }

  function cerrar(resultado) {
    if (dialogo?.open) dialogo.close();
    if (resolver) {
      const completar = resolver;
      resolver = null;
      completar(resultado);
    }
  }

  function mostrar({ titulo = "Aviso", mensaje = "", tipo = "info", confirmar = false } = {}) {
    const dlg = crearDialogo();
    if (dlg.open) dlg.close();

    dlg.dataset.tipo = tipo;
    dlg.querySelector("#appDialogTitulo").textContent = titulo;
    dlg.querySelector("#appDialogMensaje").textContent = String(mensaje);
    dlg.querySelector("#appDialogCancelar").classList.toggle("hidden", !confirmar);
    dlg.querySelector("#appDialogAceptar").textContent = confirmar ? "Confirmar" : "Aceptar";

    dlg.showModal();
    requestAnimationFrame(() => dlg.querySelector("#appDialogAceptar")?.focus());

    return new Promise((resolve) => {
      resolver = resolve;
    });
  }

  window.GymDialog = {
    aviso(mensaje, titulo = "Aviso") {
      return mostrar({ titulo, mensaje, tipo: "info" });
    },
    exito(mensaje, titulo = "Listo") {
      return mostrar({ titulo, mensaje, tipo: "success" });
    },
    error(mensaje, titulo = "Ocurrió un problema") {
      return mostrar({ titulo, mensaje, tipo: "error" });
    },
    confirmar(mensaje, titulo = "Confirmar acción") {
      return mostrar({ titulo, mensaje, tipo: "warning", confirmar: true });
    }
  };


  // API común utilizada por los módulos de la aplicación.
  window.appAlert = (mensaje, opciones = {}) => {
    const { titulo = "Aviso", tipo = "info" } = opciones;
    return mostrar({ titulo, mensaje, tipo, confirmar: false });
  };

  window.appConfirm = (mensaje, opciones = {}) => {
    const { titulo = "Confirmar acción", tipo = "warning" } = opciones;
    return mostrar({ titulo, mensaje, tipo, confirmar: true });
  };

  // Sustituye los cuadros nativos del navegador sin cambiar el resto del código.
  window.alert = (mensaje) => {
    const texto = String(mensaje ?? "");
    const esExito = /guardad|actualizar|terminad|sincronizar/i.test(texto) && !/no se|error|incorrect/i.test(texto);
    return esExito ? window.GymDialog.exito(texto) : window.GymDialog.error(texto);
  };
})();
