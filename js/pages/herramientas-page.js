import { inicializarPanelAjustes } from "../ui/settings-modal.js";
import { inicializarCalculadorasDiscos, renderizarCamposDiscos } from "../features/herramientas/discos.js";
import { inicializarCalculadorasGenerales } from "../features/herramientas/calculadoras.js";

inicializarCalculadorasDiscos();
inicializarCalculadorasGenerales();
inicializarPanelAjustes({ onChange: renderizarCamposDiscos });
