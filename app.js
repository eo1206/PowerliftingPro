const form = document.querySelector("form");
const lista = document.querySelector(".card:last-of-type");

let registros = JSON.parse(localStorage.getItem("registrosPower")) || [];

form.addEventListener("submit", function (e) {
  e.preventDefault();

  const ejercicio = form.querySelector("select").value;
  const inputs = form.querySelectorAll("input");

  const peso = Number(inputs[0].value);
  const reps = Number(inputs[1].value);
  const series = Number(inputs[2].value);
  const rpe = Number(inputs[3].value);
  const notas = form.querySelector("textarea").value;

  if (!peso || !reps || !series) {
    alert("Completa peso, reps y series");
    return;
  }

  const registro = {
    id: Date.now(),
    ejercicio,
    peso,
    reps,
    series,
    rpe,
    notas,
    volumen: peso * reps * series,
    fecha: new Date().toLocaleDateString("es-MX")
  };

  registros.unshift(registro);
  guardarRegistros();
  mostrarRegistros();

  form.reset();
});

function guardarRegistros() {
  localStorage.setItem("registrosPower", JSON.stringify(registros));
}

function mostrarRegistros() {
  lista.innerHTML = "<h2>Últimos registros</h2>";

  if (registros.length === 0) {
    lista.innerHTML += `<p class="empty">Todavía no hay registros.</p>`;
    return;
  }

  registros.forEach((r) => {
    lista.innerHTML += `
      <div class="exercise">
        <div>
          <h3>${r.ejercicio}</h3>
          <p>${r.series} series · ${r.reps} reps · ${r.peso} kg</p>
          <p>Volumen: ${r.volumen} kg · ${r.fecha}</p>
          ${r.notas ? `<p>Nota: ${r.notas}</p>` : ""}
        </div>

        <div class="right">
          <span>RPE ${r.rpe || "-"}</span>
          <button class="delete" onclick="borrarRegistro(${r.id})">×</button>
        </div>
      </div>
    `;
  });
}

function borrarRegistro(id) {
  registros = registros.filter((r) => r.id !== id);
  guardarRegistros();
  mostrarRegistros();
}

mostrarRegistros();