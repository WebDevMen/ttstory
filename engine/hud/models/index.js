// Registry of holo3d models (component holo3d: `model: <name>`). Add your own: a file exporting
// default (canvas, H, opts) -> { render(localTime, params) -> {pointKey: [x, y]} } and a line here.
import globe from "./globe.js";
import still from "./still.js";
import tanker from "./tanker.js";

export default { globe, still, tanker };
