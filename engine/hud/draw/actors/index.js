// Registry of built-in draw actors (`actor: <name>` in a draw shot). Project-specific actors live in
// projects/<id>/actors/*.js (every named export becomes an actor) and override built-ins with the same name.
import * as basic from "./basic.js";
import * as people from "./people.js";
import * as world from "./world.js";
import * as interior from "./interior.js";
import * as ui from "./ui.js";
import * as libs from "./libs.js";
import * as casino from "./casino.js";
import * as cards from "./cards.js";
import * as odds from "./odds.js";
import * as medieval from "./medieval.js";
import * as figures from "./figures.js";
import * as evidence from "./evidence.js";
import * as places from "./places.js";
import * as aerial from "./aerial.js";
import * as home from "./home.js";
import * as phone_screens from "./phone_screens.js";

const FILES = { basic, people, world, interior, ui, libs, casino, cards, odds, medieval, figures, evidence, places, aerial, home, phone_screens };
const seen = {};
for (const [file, mod] of Object.entries(FILES)) for (const name of Object.keys(mod)) {
  if (seen[name]) throw new Error(`draw actor '${name}' is defined twice: actors/${seen[name]}.js and actors/${file}.js`);
  seen[name] = file;
}

export default Object.assign({}, ...Object.values(FILES));
