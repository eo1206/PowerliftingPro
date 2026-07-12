import { obtenerConfiguracion, guardarConfiguracion, restablecerConfiguracion } from "./settings.js";

const calcularDiscos = document.getElementById("calcularDiscos");
const calcularPeso = document.getElementById("calcularPeso");
const calcular1RM = document.getElementById("calcular1RM");
const calcularGL = document.getElementById("calcularGL");

function obtenerDiscosDisponibles() {
  return [...obtenerConfiguracion().discosDisponibles]
    .map(Number)
    .filter((valor) => Number.isFinite(valor) && valor > 0)
    .sort((a, b) => b - a);
}

function calcularCargaPorLado(pesoTotal, pesoBarra) {
  return (pesoTotal - pesoBarra) / 2;
}

function buscarCombinacion(pesoPorLado, discos) {
  let restante = pesoPorLado;
  const resultado = [];

  for (const disco of discos) {
    const cantidad = Math.floor(restante / disco);

    if (cantidad > 0) {
      resultado.push({ disco, cantidad });
      restante = Number((restante - cantidad * disco).toFixed(2));
    }
  }

  return {
    posible: restante === 0,
    combinacion: resultado,
    restante
  };
}

function encontrarPesoCercano(pesoObjetivo, pesoBarra, discos, direccion) {
  let peso = pesoObjetivo;

  for (let i = 0; i < 300; i++) {
    peso += direccion;

    if (peso <= pesoBarra) continue;

    const porLado = calcularCargaPorLado(peso, pesoBarra);

    if (porLado < 0) continue;

    const intento = buscarCombinacion(porLado, discos);

    if (intento.posible) {
      return peso;
    }
  }

  return null;
}

calcularDiscos.addEventListener("click", () => {
  const pesoObjetivo = Number(document.getElementById("pesoObjetivo").value);
  const pesoBarra = Number(document.getElementById("pesoBarra").value);
  const resultadoDiscos = document.getElementById("resultadoDiscos");

  const discos = obtenerDiscosDisponibles();

  if (!pesoObjetivo || !pesoBarra) {
    resultadoDiscos.innerHTML = `<p class="empty">Ingresa peso objetivo y peso de barra.</p>`;
    return;
  }

  if (pesoObjetivo < pesoBarra) {
    resultadoDiscos.innerHTML = `<p class="empty">El peso total no puede ser menor que la barra.</p>`;
    return;
  }

  const pesoPorLado = calcularCargaPorLado(pesoObjetivo, pesoBarra);
  const resultado = buscarCombinacion(pesoPorLado, discos);

  if (resultado.posible) {
    resultadoDiscos.innerHTML = `<h3>Por lado:</h3>`;

    resultado.combinacion.forEach(item => {
      resultadoDiscos.innerHTML += `
        <p>${item.cantidad} disco(s) de ${item.disco} kg</p>
      `;
    });

    return;
  }

  const menor = encontrarPesoCercano(pesoObjetivo, pesoBarra, discos, -0.5);
  const mayor = encontrarPesoCercano(pesoObjetivo, pesoBarra, discos, 0.5);

  resultadoDiscos.innerHTML = `
    <p class="empty">No se puede realizar ese peso con los discos seleccionados.</p>
    <p>Sugerencia menor: ${menor ? menor + " kg" : "No disponible"}</p>
    <p>Sugerencia mayor: ${mayor ? mayor + " kg" : "No disponible"}</p>
  `;
});

calcularPeso.addEventListener("click", () => {
  const barra = Number(document.getElementById("pesoBarra").value) || 20;

  const discos = [
    { peso: 25, cantidad: Number(document.getElementById("d25").value) || 0 },
    { peso: 20, cantidad: Number(document.getElementById("d20").value) || 0 },
    { peso: 15, cantidad: Number(document.getElementById("d15").value) || 0 },
    { peso: 10, cantidad: Number(document.getElementById("d10").value) || 0 },
    { peso: 5, cantidad: Number(document.getElementById("d5").value) || 0 },
    { peso: 2.5, cantidad: Number(document.getElementById("d25chico").value) || 0 },
    { peso: 1.25, cantidad: Number(document.getElementById("d125").value) || 0 }
  ];

  let pesoPorLado = 0;

  discos.forEach(disco => {
    pesoPorLado += disco.peso * disco.cantidad;
  });

  const total = barra + pesoPorLado * 2;

  document.getElementById("resultadoPeso").innerHTML = `
    <h3>Peso total: ${total.toFixed(1)} kg</h3>
  `;
});

calcular1RM.addEventListener("click", () => {
  const peso = Number(document.getElementById("peso1rm").value);
  const reps = Number(document.getElementById("reps1rm").value);
  const resultado1RM = document.getElementById("resultado1RM");

  if (!peso || !reps) {
    resultado1RM.innerHTML = `<p class="empty">Ingresa peso y reps.</p>`;
    return;
  }

  const rm = peso * 36 / (37 - reps);

  resultado1RM.innerHTML = `
    <h3>1RM estimado: ${rm.toFixed(1)} kg</h3>
  `;
});

const coeficientesGL = {
  hombre: {
    equippedPowerlifting: { A: 1236.25115, B: 1449.21864, C: 0.01644 },
    classicPowerlifting: { A: 1199.72839, B: 1025.18162, C: 0.00921 },
    equippedBench: { A: 381.22073, B: 733.79378, C: 0.02398 },
    classicBench: { A: 320.98041, B: 281.40258, C: 0.01008 }
  },
  mujer: {
    equippedPowerlifting: { A: 758.63878, B: 949.31382, C: 0.02435 },
    classicPowerlifting: { A: 610.32796, B: 1045.59282, C: 0.03048 },
    equippedBench: { A: 221.82209, B: 357.00377, C: 0.02937 },
    classicBench: { A: 142.40398, B: 442.52671, C: 0.04724 }
  }
};

calcularGL.addEventListener("click", () => {
  const sexo = document.getElementById("sexoGL").value;
  const modalidad = document.getElementById("modalidadGL").value;
  const pesoCorporal = Number(document.getElementById("pesoCorporalGL").value);
  const total = Number(document.getElementById("totalGL").value);
  const resultadoGL = document.getElementById("resultadoGL");

  if (!pesoCorporal || !total) {
    resultadoGL.innerHTML = `<p class="empty">Ingresa peso corporal y total.</p>`;
    return;
  }

  const { A, B, C } = coeficientesGL[sexo][modalidad];

  const coeficiente = 100 / (A - B * Math.exp(-C * pesoCorporal));
  const puntos = total * coeficiente;

  resultadoGL.innerHTML = `
    <h3>IPF GL: ${puntos.toFixed(3)} puntos</h3>
  `;
});

// =========================
// Ajustes de GymLog
// =========================
const panelAjustes = document.getElementById("panelAjustes");
const abrirAjustes = document.getElementById("abrirAjustes");
const abrirAjustesSecundario = document.getElementById("abrirAjustesSecundario");
const cerrarAjustes = document.getElementById("cerrarAjustes");
const guardarAjustesBtn = document.getElementById("guardarAjustes");
const restablecerAjustesBtn = document.getElementById("restablecerAjustes");
const ajustePesoBarra = document.getElementById("ajustePesoBarra");
const resumenConfiguracion = document.getElementById("resumenConfiguracion");
const checkboxesDiscos = [...document.querySelectorAll("#ajustesDiscos input[type='checkbox']")];
const opcionesTema = [...document.querySelectorAll(".theme-option")];

function nombreTema(tema) {
  return ({ rojo: "Rojo", rosa: "Rosa", azul: "Azul", morado: "Morado", verde: "Verde" })[tema] || "Rojo";
}

function cargarAjustesEnFormulario() {
  const config = obtenerConfiguracion();
  ajustePesoBarra.value = config.pesoBarra;

  checkboxesDiscos.forEach((checkbox) => {
    checkbox.checked = config.discosDisponibles.map(Number).includes(Number(checkbox.value));
  });

  opcionesTema.forEach((boton) => {
    boton.classList.toggle("selected", boton.dataset.themeValue === config.tema);
  });
}

function aplicarAjustesEnHerramientas() {
  const config = obtenerConfiguracion();
  const pesoBarraInput = document.getElementById("pesoBarra");
  if (pesoBarraInput) pesoBarraInput.value = config.pesoBarra;

  const discos = config.discosDisponibles
    .map(Number)
    .sort((a, b) => b - a)
    .map((peso) => `${peso} kg`)
    .join(", ");

  if (resumenConfiguracion) {
    resumenConfiguracion.textContent = `Barra: ${config.pesoBarra} kg · Discos: ${discos || "ninguno"} · Tema: ${nombreTema(config.tema)}`;
  }
}

function mostrarAjustes() {
  cargarAjustesEnFormulario();
  panelAjustes.classList.remove("hidden");
  panelAjustes.setAttribute("aria-hidden", "false");
  document.body.classList.add("settings-open");
}

function ocultarAjustes() {
  panelAjustes.classList.add("hidden");
  panelAjustes.setAttribute("aria-hidden", "true");
  document.body.classList.remove("settings-open");
}

abrirAjustes?.addEventListener("click", mostrarAjustes);
abrirAjustesSecundario?.addEventListener("click", mostrarAjustes);
cerrarAjustes?.addEventListener("click", ocultarAjustes);

panelAjustes?.addEventListener("click", (event) => {
  if (event.target === panelAjustes) ocultarAjustes();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !panelAjustes?.classList.contains("hidden")) ocultarAjustes();
});

opcionesTema.forEach((boton) => {
  boton.addEventListener("click", () => {
    opcionesTema.forEach((opcion) => opcion.classList.remove("selected"));
    boton.classList.add("selected");
    document.documentElement.dataset.theme = boton.dataset.themeValue;
  });
});

guardarAjustesBtn?.addEventListener("click", async () => {
  const pesoBarra = Number(ajustePesoBarra.value);
  const discosDisponibles = checkboxesDiscos
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => Number(checkbox.value));
  const tema = document.querySelector(".theme-option.selected")?.dataset.themeValue || "rojo";

  if (!Number.isFinite(pesoBarra) || pesoBarra < 0) {
    await window.appAlert?.("Escribe un peso de barra válido.", { titulo: "Revisa el peso", tipo: "warning" });
    return;
  }

  if (!discosDisponibles.length) {
    await window.appAlert?.("Selecciona al menos un disco disponible.", { titulo: "Faltan discos", tipo: "warning" });
    return;
  }

  guardarConfiguracion({ pesoBarra, discosDisponibles, tema });
  aplicarAjustesEnHerramientas();
  ocultarAjustes();
  await window.appAlert?.("Tus preferencias se guardaron en este dispositivo.", { titulo: "Ajustes guardados", tipo: "success" });
});

restablecerAjustesBtn?.addEventListener("click", async () => {
  const confirmar = window.appConfirm
    ? await window.appConfirm("Se restaurará la barra de 20 kg, los discos predeterminados y el tema rojo.", { titulo: "Restablecer ajustes" })
    : window.confirm("¿Restablecer ajustes?");
  if (!confirmar) return;

  restablecerConfiguracion();
  cargarAjustesEnFormulario();
  aplicarAjustesEnHerramientas();
});

window.addEventListener("gymlog:config", aplicarAjustesEnHerramientas);
cargarAjustesEnFormulario();
aplicarAjustesEnHerramientas();
