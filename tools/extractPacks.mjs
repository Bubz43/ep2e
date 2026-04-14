import { extractPack } from "@foundryvtt/foundryvtt-cli";
import { promises as fs } from "fs";

const SYSTEM_ID = process.cwd();

const packs = await fs.readdir("./packs");
for (const pack of packs) {
  if (pack.startsWith(".")) continue;
  console.log("Extracting " + pack);
  await fs.mkdir(`${SYSTEM_ID}/src/packs/${pack}`, { recursive: true });
  await extractPack(
    `${SYSTEM_ID}/packs/${pack}`,
    `${SYSTEM_ID}/src/packs/${pack}`,
    { log: true },
  );
}
