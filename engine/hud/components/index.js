// Registry of HUD components available in project.yaml (`component: <name>`). Add your own by exporting it here.
import * as basic from "./basic.js";
import * as panels from "./panels.js";
import * as overlays from "./overlays.js";
import * as holo from "./holo.js";

export default { ...basic, ...panels, ...overlays, ...holo };
