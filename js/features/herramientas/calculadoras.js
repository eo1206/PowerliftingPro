export function inicializarCalculadorasGenerales() {
  document.getElementById("calcular1RM")?.addEventListener("click", () => {
    const peso = Number(document.getElementById("peso1rm")?.value);
    const reps = Number(document.getElementById("reps1rm")?.value);
    const salida = document.getElementById("resultado1RM");
    if (!peso || !reps || reps >= 37) {
      salida.innerHTML = '<p class="empty">Ingresa un peso y repeticiones válidas.</p>';
      return;
    }
    salida.innerHTML = `<h3>1RM estimado: ${(peso * 36 / (37 - reps)).toFixed(1)} kg</h3>`;
  });

  const coeficientes = {
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

  document.getElementById("calcularGL")?.addEventListener("click", () => {
    const sexo = document.getElementById("sexoGL").value;
    const modalidad = document.getElementById("modalidadGL").value;
    const corporal = Number(document.getElementById("pesoCorporalGL").value);
    const total = Number(document.getElementById("totalGL").value);
    const salida = document.getElementById("resultadoGL");
    if (!corporal || !total) {
      salida.innerHTML = '<p class="empty">Ingresa peso corporal y total.</p>';
      return;
    }
    const { A, B, C } = coeficientes[sexo][modalidad];
    salida.innerHTML = `<h3>IPF GL: ${(total * 100 / (A - B * Math.exp(-C * corporal))).toFixed(3)} puntos</h3>`;
  });
}
