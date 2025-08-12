import fs from "node:fs/promises";
import * as ssm from "./lib/ssm-client.js";
import {
  parseCliArgs,
  parseInput,
  enrichWithSsmParams,
  formatEnvVarsAsString,
} from "./lib/utils.js";

const INPUT_FILE = ".env.example";
const OUTPUT_FILE = ".env.local";
const FILE_ENCODING = "utf-8";

export async function handler() {
  const args = parseCliArgs(process.argv || []);
  const inputFile = typeof args.input === "string" ? args.input : INPUT_FILE;
  const outputFile =
    typeof args.output === "string" ? args.output : OUTPUT_FILE;

  console.log(`Reading input file ${inputFile}`);
  const input = await fs.readFile(inputFile, FILE_ENCODING);

  const envVarsWithoutSsmValues = parseInput(input);

  const ssmPaths = envVarsWithoutSsmValues
    .filter((envVar) => envVar.type === "ssm")
    .map((envVar) => envVar.path);

  const ssmParams = ssmPaths.length ? await ssm.getParams(ssmPaths) : [];

  const envVarsWithSsmValues = enrichWithSsmParams(
    envVarsWithoutSsmValues,
    ssmParams
  );

  const result = `# Created at ${new Date().toISOString()}
# ---
${formatEnvVarsAsString(envVarsWithSsmValues)}`;

  console.log(`Writing environment variables to ${outputFile}`);
  await fs.writeFile(outputFile, result, FILE_ENCODING);
}
