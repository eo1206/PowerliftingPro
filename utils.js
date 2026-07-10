export const $ = (selector, root = document) => root.querySelector(selector);

export function numeroValido(valor, { minimo = 0, maximo = Infinity } = {}) {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > minimo && numero <= maximo ? numero : null;
}

export function calcular1RM(peso, reps) {
  const p = Number(peso);
  const r = Number(reps);
  if (!Number.isFinite(p) || !Number.isFinite(r) || p <= 0 || r <= 0 || r >= 37) return 0;
  if (r === 1) return Number(p.toFixed(1));
  return Number(((p * 36) / (37 - r)).toFixed(1));
}

export function escaparHTML(valor = "") {
  const div = document.createElement("div");
  div.textContent = String(valor);
  return div.innerHTML;
}

export function fechaLocal() {
  return new Date().toLocaleDateString("es-MX");
}
