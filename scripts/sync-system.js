const fs = require("fs");

const system = JSON.parse(fs.readFileSync("./system.json"));
const { version } = system;

const path = `https://github.com/Bubz43/ep2e/releases/download/${version}`;

system.manifest = `${path}/system.json`;
system.download = `${path}/latest.zip`

// TODO Maybe throw error if version unchanged

fs.writeFileSync("./system.json", JSON.stringify(system))


