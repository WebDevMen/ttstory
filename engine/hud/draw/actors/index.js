// Registry of built-in draw actors (`actor: <name>` in a draw shot). Project-specific actors live in
// projects/<id>/actors/*.js (every named export becomes an actor) and override built-ins with the same name.
import * as basic from "./basic.js";
import * as people from "./people.js";
import * as world from "./world.js";
import * as interior from "./interior.js";
import * as ui from "./ui.js";
import * as libs from "./libs.js";

export default { ...basic, ...people, ...world, ...interior, ...ui, ...libs };
