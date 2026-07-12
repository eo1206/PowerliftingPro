const CONFIG_KEY = "gymlog-config-v2";

export const CONFIG_PREDETERMINADA = Object.freeze({
  pesoBarra: 20,
  discosDisponibles: [25, 20, 15, 10, 5, 2.5],
  tema: "rojo",
  unidad: "kg"
});

function normalizarConfiguracion(valor = {}) {
  const pesoBarra = Number(valor.pesoBarra);
  const discos = Array.isArray(valor.discosDisponibles)
    ? valor.discosDisponibles.map(Number).filter((n) => Number.isFinite(n) && n > 0)
    : CONFIG_PREDETERMINADA.discosDisponibles;

  return {
    ...CONFIG_PREDETERMINADA,
    ...valor,
    pesoBarra: Number.isFinite(pesoBarra) && pesoBarra >= 0 ? pesoBarra : CONFIG_PREDETERMINADA.pesoBarra,
    discosDisponibles: [...new Set(discos)].sort((a, b) => b - a),
    tema: ["rojo", "rosa", "azul", "morado", "verde"].includes(valor.tema)
      ? valor.tema
      : CONFIG_PREDETERMINADA.tema,
    unidad: ["kg", "lb"].includes(valor.unidad) ? valor.unidad : "kg"
  };
}

export function obtenerConfiguracion() {
  try {
    const guardada = JSON.parse(localStorage.getItem(CONFIG_KEY) || "null");
    return normalizarConfiguracion(guardada || {});
  } catch (error) {
    console.warn("No se pudo leer la configuración:", error);
    return { ...CONFIG_PREDETERMINADA, discosDisponibles: [...CONFIG_PREDETERMINADA.discosDisponibles] };
  }
}

export function aplicarTema(tema = "rojo") {
  const temaSeguro = ["rojo", "rosa", "azul", "morado", "verde"].includes(tema) ? tema : "rojo";
  document.documentElement.dataset.theme = temaSeguro;
}

export function guardarConfiguracion(cambios = {}) {
  const nueva = normalizarConfiguracion({ ...obtenerConfiguracion(), ...cambios });
  localStorage.setItem(CONFIG_KEY, JSON.stringify(nueva));
  aplicarTema(nueva.tema);
  window.dispatchEvent(new CustomEvent("gymlog:config", { detail: nueva }));
  return nueva;
}

export function restablecerConfiguracion() {
  localStorage.removeItem(CONFIG_KEY);
  const config = obtenerConfiguracion();
  aplicarTema(config.tema);
  window.dispatchEvent(new CustomEvent("gymlog:config", { detail: config }));
  return config;
}

aplicarTema(obtenerConfiguracion().tema);
