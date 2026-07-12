import {
  obtenerConfiguracion,
  guardarConfiguracion,
  restablecerConfiguracion
} from "../core/settings-store.js";

export function inicializarPanelAjustes({ onChange } = {}) {
  const panel = document.getElementById("panelAjustes");
  if (!panel) return;

  const abrir = document.getElementById("abrirAjustes");
  const cerrar = document.getElementById("cerrarAjustes");
  const guardar = document.getElementById("guardarAjustes");
  const restablecer = document.getElementById("restablecerAjustes");
  const pesoBarra = document.getElementById("ajustePesoBarra");
  const discos = [...document.querySelectorAll("#ajustesDiscos input[type='checkbox']")];
  const temas = [...document.querySelectorAll(".theme-option")];

  function cargarFormulario() {
    const config = obtenerConfiguracion();
    pesoBarra.value = config.pesoBarra;
    discos.forEach((input) => {
      input.checked = config.discosDisponibles.includes(Number(input.value));
    });
    temas.forEach((boton) => {
      boton.classList.toggle("selected", boton.dataset.themeValue === config.tema);
    });
  }

  function mostrar() {
    cargarFormulario();
    panel.classList.remove("hidden");
    panel.setAttribute("aria-hidden", "false");
    document.body.classList.add("settings-open");
  }

  function ocultar() {
    panel.classList.add("hidden");
    panel.setAttribute("aria-hidden", "true");
    document.body.classList.remove("settings-open");
  }

  abrir?.addEventListener("click", mostrar);
  cerrar?.addEventListener("click", ocultar);
  panel.addEventListener("click", (event) => {
    if (event.target === panel) ocultar();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.classList.contains("hidden")) ocultar();
  });

  temas.forEach((boton) => {
    boton.addEventListener("click", () => {
      temas.forEach((item) => item.classList.remove("selected"));
      boton.classList.add("selected");
      document.documentElement.dataset.theme = boton.dataset.themeValue;
    });
  });

  guardar?.addEventListener("click", async () => {
    const barra = Number(pesoBarra.value);
    const seleccionados = discos.filter((input) => input.checked).map((input) => Number(input.value));
    const tema = document.querySelector(".theme-option.selected")?.dataset.themeValue || "rojo";

    if (!Number.isFinite(barra) || barra < 0) {
      await window.appAlert?.("Escribe un peso de barra válido.", { titulo: "Revisa el peso", tipo: "warning" });
      return;
    }
    if (!seleccionados.length) {
      await window.appAlert?.("Selecciona al menos un disco disponible.", { titulo: "Faltan discos", tipo: "warning" });
      return;
    }

    const config = guardarConfiguracion({ pesoBarra: barra, discosDisponibles: seleccionados, tema });
    onChange?.(config);
    ocultar();
    await window.appAlert?.("Tus preferencias se guardaron en este dispositivo.", { titulo: "Ajustes guardados", tipo: "success" });
  });

  restablecer?.addEventListener("click", async () => {
    const confirmar = window.appConfirm
      ? await window.appConfirm("Se restaurarán los valores predeterminados.", { titulo: "Restablecer ajustes" })
      : window.confirm("¿Restablecer ajustes?");
    if (!confirmar) return;
    const config = restablecerConfiguracion();
    cargarFormulario();
    onChange?.(config);
  });

  cargarFormulario();
}
