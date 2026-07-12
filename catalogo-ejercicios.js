export const CATALOGO_EJERCICIOS = [
  { nombre: "Sentadilla", grupo: "Piernas", icono: "SQ", imagen: "assets/ejercicios/sentadilla.jpg" },
  { nombre: "Prensa de piernas", grupo: "Piernas", icono: "PL", imagen: "assets/ejercicios/prensa-piernas.jpg" },
  { nombre: "Extensión de cuádriceps", grupo: "Piernas", icono: "EC", imagen: "assets/ejercicios/extension-cuadriceps.jpg" },
  { nombre: "Curl femoral", grupo: "Piernas", icono: "CF", imagen: "assets/ejercicios/curl-femoral.jpg" },
  { nombre: "Peso muerto", grupo: "Espalda", icono: "PM", imagen: "assets/ejercicios/peso-muerto.jpg" },
  { nombre: "Remo", grupo: "Espalda", icono: "RE", imagen: "assets/ejercicios/remo.jpg" },
  { nombre: "Dominadas", grupo: "Espalda", icono: "DO", imagen: "assets/ejercicios/dominadas.jpg" },
  { nombre: "Jalón al pecho", grupo: "Espalda", icono: "JP", imagen: "assets/ejercicios/jalon-pecho.jpg" },
  { nombre: "Press banca", grupo: "Pecho", icono: "PB", imagen: "assets/ejercicios/press-banca.jpg" },
  { nombre: "Press inclinado", grupo: "Pecho", icono: "PI", imagen: "assets/ejercicios/press-inclinado.jpg" },
  { nombre: "Aperturas", grupo: "Pecho", icono: "AP", imagen: "assets/ejercicios/aperturas.jpg" },
  { nombre: "Fondos", grupo: "Pecho", icono: "FO", imagen: "assets/ejercicios/fondos.jpg" },
  { nombre: "Press militar", grupo: "Hombros", icono: "PR", imagen: "assets/ejercicios/press-militar.jpg" },
  { nombre: "Elevaciones laterales", grupo: "Hombros", icono: "EL", imagen: "assets/ejercicios/elevaciones-laterales.jpg" },
  { nombre: "Pájaros", grupo: "Hombros", icono: "PA", imagen: "assets/ejercicios/pajaros.jpg" },
  { nombre: "Curl bíceps", grupo: "Bíceps", icono: "CB", imagen: "assets/ejercicios/curl-biceps.jpg" },
  { nombre: "Curl martillo", grupo: "Bíceps", icono: "CM", imagen: "assets/ejercicios/curl-martillo.jpg" },
  { nombre: "Extensión tríceps", grupo: "Tríceps", icono: "ET", imagen: "assets/ejercicios/extension-triceps.jpg" },
  { nombre: "Press francés", grupo: "Tríceps", icono: "PF", imagen: "assets/ejercicios/press-frances.jpg" },
  { nombre: "Hip thrust", grupo: "Glúteos", icono: "HT", imagen: "assets/ejercicios/hip-thrust.jpg" },
  { nombre: "Patada de glúteo", grupo: "Glúteos", icono: "PG", imagen: "assets/ejercicios/patada-gluteo.jpg" },
  { nombre: "Crunch abdominal", grupo: "Abdomen", icono: "CA", imagen: "assets/ejercicios/crunch.jpg" },
  { nombre: "Plancha", grupo: "Abdomen", icono: "PL", imagen: "assets/ejercicios/plancha.jpg" }
];

export const GRUPOS_MUSCULARES = [...new Set(CATALOGO_EJERCICIOS.map((item) => item.grupo))];

export function buscarEjercicio(nombre) {
  return CATALOGO_EJERCICIOS.find((item) => item.nombre === nombre) || null;
}
