export const CATALOGO_EJERCICIOS = [
  { nombre: "Sentadilla", icono: "SQ", imagen: "assets/ejercicios/sentadilla.jpg" },
  { nombre: "Press banca", icono: "PB", imagen: "assets/ejercicios/press-banca.jpg" },
  { nombre: "Peso muerto", icono: "PM", imagen: "assets/ejercicios/peso-muerto.jpg" },
  { nombre: "Press militar", icono: "PR", imagen: "assets/ejercicios/press-militar.jpg" },
  { nombre: "Remo", icono: "RE", imagen: "assets/ejercicios/remo.jpg" },
  { nombre: "Dominadas", icono: "DO", imagen: "assets/ejercicios/dominadas.jpg" },
  { nombre: "Fondos", icono: "FO", imagen: "assets/ejercicios/fondos.jpg" },
  { nombre: "Hip thrust", icono: "HT", imagen: "assets/ejercicios/hip-thrust.jpg" },
  { nombre: "Curl bíceps", icono: "CB", imagen: "assets/ejercicios/curl-biceps.jpg" },
  { nombre: "Extensión tríceps", icono: "ET", imagen: "assets/ejercicios/extension-triceps.jpg" }
];

export function buscarEjercicio(nombre) {
  return CATALOGO_EJERCICIOS.find((item) => item.nombre === nombre) || null;
}
