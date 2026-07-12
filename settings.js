const CONFIG_KEY = "gymlog-config-v1";

const DEFAULT_CONFIG = {
  pesoBarra: 20,
  discosDisponibles: [25, 20, 15, 10, 5, 2.5],
  tema: "rojo",
  unidad: "kg"
};

export function obtenerConfiguracion() {
  try {
    const guardada = JSON.parse(localStorage.getItem(CONFIG_KEY) || "null");
    return {
      ...DEFAULT_CONFIG,
      ...(guardada && typeof guardada === "object" ? guardada : {})
    };
  } catch (error) {
    console.warn("No se pudo leer la configuración:", error);
    return { ...DEFAULT_CONFIG };
  }
}

export function guardarConfiguracion(cambios = {}) {
  const nueva = { ...obtenerConfiguracion(), ...cambios };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(nueva));
  aplicarTema(nueva.tema);
  window.dispatchEvent(new CustomEvent("gymlog:config", { detail: nueva }));
  return nueva;
}

export function aplicarTema(tema = "rojo") {
  const permitidos = ["rojo", "rosa", "azul", "morado", "verde"];
  document.documentElement.dataset.theme = permitidos.includes(tema) ? tema : "rojo";
}

export function restablecerConfiguracion() {
  localStorage.removeItem(CONFIG_KEY);
  aplicarTema(DEFAULT_CONFIG.tema);
  window.dispatchEvent(new CustomEvent("gymlog:config", { detail: { ...DEFAULT_CONFIG } }));
  return { ...DEFAULT_CONFIG };
}

aplicarTema(obtenerConfiguracion().tema);
