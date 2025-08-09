import { Parameter } from "@aws-sdk/client-ssm";
import fs from "node:fs/promises";
import * as ssm from "./ssm.js";

const INPUT_FILE = process.env.INPUT_FILE || ".env.example";
const OUTPUT_FILE = process.env.OUTPUT_FILE || ".env.fetched";
export const SSM_VALUE_NOT_FOUND = "__SSM_NOT_FOUND__";
const FILE_ENCODING = "utf-8";

// npx tsx src/index.ts --input=.env.example --output=.env.fetched

handler()
  .then(() => {
    console.log("Script completed successfully");
  })
  .catch((error) => {
    console.error("Script failed");
    console.error(error);
    process.exit(1);
  });

export type EnvVars = {
  [key: string]: string | undefined;
};

export type ParsedEnvVars = {
  [key: string]:
    | {
        type: "value";
        value: string | undefined;
      }
    | {
        type: "ssm";
        path: string;
        value: string | undefined;
      };
};

async function handler() {
  const args = parseCliArgs(process.argv || []);
  const inputFile = typeof args.input === "string" ? args.input : INPUT_FILE;
  const outputFile =
    typeof args.output === "string" ? args.output : OUTPUT_FILE;

  console.log(`Reading input file ${inputFile}`);
  const input = await fs.readFile(inputFile, FILE_ENCODING);

  const envVarsWithoutSsmValues = parseInput(input);

  const ssmPaths = getSsmPaths(envVarsWithoutSsmValues);
  const ssmParams = ssmPaths.length ? await ssm.getSsmParams(ssmPaths) : [];

  const envVarsWithSsmValues = enrichEnvVarsWithSsmParams(
    envVarsWithoutSsmValues,
    ssmParams
  );
  const envVarsResult = normalizeEnvVars(envVarsWithSsmValues);
  const outputLines = envVarsToLines(envVarsResult);

  console.log(`Writing environment variables to ${outputFile}`);
  await fs.writeFile(outputFile, outputLines, FILE_ENCODING);
}

export function parseCliArgs(cliArgs: string[]) {
  const args: Record<string, string | boolean> = {};

  for (const cliArg of cliArgs) {
    if (cliArg.startsWith("--")) {
      const [key, value] = cliArg.slice(2).split("=");

      args[key] = value || true; // If no value is provided, set it to true
    }
  }

  return args;
}

export function parseInput(input: string): ParsedEnvVars {
  const lines = input.split("\n").filter((line) => line.trim());

  const result: ParsedEnvVars = {};

  for (const line of lines) {
    const [key, value] = line.split("=").map((part) => part.trim());

    if (!key) {
      continue;
    }

    const isSsmParam = value.startsWith("ssm:");
    const ssmPath = value.slice(4).trim();

    if (isSsmParam && ssmPath) {
      result[key] = {
        type: "ssm",
        path: ssmPath,
        value: undefined, // Value will be fetched later
      };
    } else {
      result[key] = {
        type: "value",
        value: value || undefined,
      };
    }
  }

  return result;
}

function getSsmPaths(envVars: ParsedEnvVars) {
  const ssmPaths: string[] = [];

  for (const envVar of Object.values(envVars)) {
    if (envVar.type === "ssm" && envVar.path) {
      ssmPaths.push(envVar.path);
    }
  }

  return ssmPaths;
}

export function enrichEnvVarsWithSsmParams(
  envVars: ParsedEnvVars,
  ssmParams: Parameter[] = []
): ParsedEnvVars {
  const result: ParsedEnvVars = {};

  for (const [key, envVar] of Object.entries(envVars)) {
    if (envVar.type === "ssm") {
      const param = ssmParams.find((p) => p.Name === envVar.path);

      result[key] = {
        ...envVar,
        value: param?.Value,
      };
    } else {
      result[key] = envVar;
    }
  }

  return result;
}

export function normalizeEnvVars(envVars: ParsedEnvVars): EnvVars {
  const normalized: EnvVars = {};

  for (const [key, envVar] of Object.entries(envVars)) {
    if (envVar.type === "value") {
      normalized[key] = envVar.value;
    } else if (envVar.type === "ssm") {
      normalized[key] = envVar.value || SSM_VALUE_NOT_FOUND;
    }
  }

  return normalized;
}

export function envVarsToLines(envVars: EnvVars) {
  return Object.entries(envVars)
    .map(([key, value]) => `${key}=${value || ""}`)
    .join("\n");
}
