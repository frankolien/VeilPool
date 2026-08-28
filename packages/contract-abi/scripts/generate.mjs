import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const artifactPath = resolve(
  root,
  "packages/contracts-production/artifacts/contracts/ConfidentialPrizePool.sol/ConfidentialPrizePool.json",
);
const outputPath = resolve(here, "../src/abi.generated.ts");

const artifact = JSON.parse(await readFile(artifactPath, "utf8"));
const source = [
  "// Generated from ConfidentialPrizePool.json. Do not edit by hand.",
  `export const confidentialPrizePoolAbi = ${JSON.stringify(artifact.abi, null, 2)} as const;`,
  "",
].join("\n");

await writeFile(outputPath, source);
console.log(`Generated ${outputPath} (${artifact.abi.length} ABI entries)`);
