import { Parameter } from "@aws-sdk/client-ssm";
import fs from "node:fs/promises";
import * as ssm from "./ssm.js";

const INPUT_FILE = process.env.INPUT_FILE || ".env.example";
const OUTPUT_FILE = process.env.OUTPUT_FILE || ".env.local";
const SSM_VALUE_NOT_FOUND = "__NOT_FOUND__";

// npx tsx src/index.ts

handler()
  .then(() => {
    console.log("Script completed successfully");
  })
  .catch((error) => {
    console.error("Script failed", error);
    process.exit(1);
  });

async function handler(filePath: string = INPUT_FILE) {
  const envVars = await readEnvVarsFromFile(filePath);

  const ssmPaths = getSsmPaths(envVars);
  const ssmParams = await ssm.getSsmParams(ssmPaths);

  if (ssmParams) {
    const envVarsResult = mergeSsmParamsIntoEnvVars(envVars, ssmParams);

    await writeEnvVarsToFile(envVarsResult, OUTPUT_FILE);
  }
}

type ParsedEnvVars = {
  [key: string]: {
    type: "ssm" | "value";
    value: string | undefined;
  };
};

type ResultedEnvVars = {
  [key: string]: string | undefined;
};

export function parseInput(input: string): ParsedEnvVars {
  const lines = input.split("\n").filter((line) => line.trim());

  const result: ParsedEnvVars = {};

  for (const line of lines) {
    const [key, value] = line.split("=").map((part) => part.trim());

    if (!key) {
      continue;
    }

    if (value.startsWith("ssm:")) {
      result[key] = {
        type: "ssm",
        value: value.slice(4), // Remove 'ssm:' prefix
      };
    } else {
      result[key] = {
        type: "value",
        value: value || undefined, // Handle empty values
      };
    }
  }

  return result;
}

function getSsmPaths(envVars: ParsedEnvVars) {
  const ssmPaths: string[] = [];

  for (const envVar of Object.values(envVars)) {
    if (envVar.type === "ssm" && envVar.value) {
      ssmPaths.push(envVar.value);
    }
  }

  return ssmPaths;
}

function mergeSsmParamsIntoEnvVars(
  envVars: ParsedEnvVars,
  ssmParams: Parameter[]
): ResultedEnvVars {
  const merged: ResultedEnvVars = {};

  for (const [key, envVar] of Object.entries(envVars)) {
    if (envVar.type === "ssm" && envVar.value) {
      const param = ssmParams.find((p) => p.Name === envVar.value);

      merged[key] = param ? param.Value : SSM_VALUE_NOT_FOUND;
    } else {
      merged[key] = envVar.value;
    }
  }

  return merged;
}

async function readEnvVarsFromFile(filePath: string): Promise<ParsedEnvVars> {
  console.log(`Reading input from ${filePath}`);
  const input = await fs.readFile(filePath, "utf-8");

  const envVars = parseInput(input);

  return envVars;
}

async function writeEnvVarsToFile(envVars: ResultedEnvVars, filePath: string) {
  const lines = Object.entries(envVars)
    .map(([key, value]) => `${key}=${value || ""}`)
    .join("\n");

  console.log(`Writing environment variables to ${filePath}`);
  await fs.writeFile(filePath, lines, "utf-8");
}
