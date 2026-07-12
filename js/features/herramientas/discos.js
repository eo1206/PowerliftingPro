import { obtenerConfiguracion } from "../../core/settings-store.js";

function buscarCombinacion(pesoPorLado, discos) {
  let restante = Number(pesoPorLado.toFixed(2));
  const combinacion = [];
  for (const disco of discos) {
    const cantidad = Math.floor((restante + 1e-9) / disco);
    if (cantidad > 0) {
      combinacion.push({ disco, cantidad });
      restante = Number((restante - cantidad * disco).toFixed(2));
    }
  }
  return { posible: Math.abs(restante) < 0.001, combinacion, restante };
}

function encontrarPesoCercano(objetivo, barra, discos, direccion) {
  for (let paso = 1; paso <= 600; paso++) {
    const peso = Number((objetivo + direccion * paso * 0.5).toFixed(2));
    if (peso < barra) continue;
    if (buscarCombinacion((peso - barra) / 2, discos).posible) return peso;
  }
  return null;
}

export function renderizarCamposDiscos() {
  const contenedor = document.getElementById("camposDiscosDisponibles");
  if (!contenedor) return;
  const discos = obtenerConfiguracion().discosDisponibles;
  contenedor.innerHTML = discos.map((peso) => `
    <label class="plate-count-field">
      <span>${peso} kg por lado</span>
      <input class="cantidad-disco" data-peso="${peso}" type="number" min="0" step="1" inputmode="numeric" placeholder="0">
    </label>
  `).join("");
}

export function inicializarCalculadorasDiscos() {
  renderizarCamposDiscos();

  document.getElementById("calcularDiscos")?.addEventListener("click", () => {
    const objetivo = Number(document.getElementById("pesoObjetivo")?.value);
    const salida = document.getElementById("resultadoDiscos");
    const { pesoBarra: barra, discosDisponibles: discos } = obtenerConfiguracion();

    if (!Number.isFinite(objetivo) || objetivo <= 0) {
      salida.innerHTML = '<p class="empty">Ingresa el peso total que quieres cargar.</p>';
      return;
    }
    if (objetivo < barra) {
      salida.innerHTML = `<p class="empty">El peso no puede ser menor que la barra configurada (${barra} kg).</p>`;
      return;
    }

    const resultado = buscarCombinacion((objetivo - barra) / 2, discos);
    if (resultado.posible) {
      salida.innerHTML = `
        <div class="tool-result">
          <p class="label">Barra configurada: ${barra} kg</p>
          <h3>Coloca por lado</h3>
          ${resultado.combinacion.length
            ? resultado.combinacion.map(({ disco, cantidad }) => `<p>${cantidad} × ${disco} kg</p>`).join("")
            : '<p>Solo la barra.</p>'}
        </div>`;
      return;
    }

    const menor = encontrarPesoCercano(objetivo, barra, discos, -1);
    const mayor = encontrarPesoCercano(objetivo, barra, discos, 1);
    salida.innerHTML = `
      <p class="empty">Ese peso no puede formarse con tu configuración actual.</p>
      <p>Más cercano abajo: ${menor ?? "No disponible"}${menor ? " kg" : ""}</p>
      <p>Más cercano arriba: ${mayor ?? "No disponible"}${mayor ? " kg" : ""}</p>`;
  });

  document.getElementById("calcularPeso")?.addEventListener("click", () => {
    const { pesoBarra: barra } = obtenerConfiguracion();
    const porLado = [...document.querySelectorAll(".cantidad-disco")].reduce((suma, input) => {
      return suma + Number(input.dataset.peso) * (Number(input.value) || 0);
    }, 0);
    document.getElementById("resultadoPeso").innerHTML = `
      <div class="tool-result">
        <p class="label">Barra configurada: ${barra} kg</p>
        <h3>Peso total: ${(barra + porLado * 2).toFixed(1)} kg</h3>
      </div>`;
  });
}
