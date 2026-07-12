# Arquitectura preparada para crecer

La aplicación conserva los archivos actuales para no romper funciones, pero las funciones nuevas deben añadirse dentro de `js/`:

- `js/core/`: estado global, configuración y servicios compartidos.
- `js/ui/`: diálogos, modales, temas y componentes reutilizables.
- `js/features/`: lógica aislada por función (herramientas, rutinas, progreso, etc.).
- `js/pages/`: punto de entrada de cada página; conecta componentes y funciones.

## Regla recomendada

Una página HTML debe cargar un solo módulo de `js/pages/`. Ese módulo importa las funciones necesarias. Así evitamos archivos enormes y dependencias duplicadas.

## Configuración

Toda preferencia del usuario se administra desde `js/core/settings-store.js`. El botón de Ajustes usa `js/ui/settings-modal.js`. Las calculadoras solo leen esa configuración; no muestran controles duplicados.
