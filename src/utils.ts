import { Parameter } from "@aws-sdk/client-ssm";
import { EnvVariable } from "./types.js";

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

export function parseInput(input: string): EnvVariable[] {
  return input
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => {
      // Handle comments
      if (line.startsWith("#")) {
        const commentVar: EnvVariable = {
          type: "comment",
          value: line,
        };

        return commentVar;
      }

      if (!line.includes("=")) {
        const otherVar: EnvVariable = {
          type: "other",
          value: line,
        };

        return otherVar;
      }

      const [key, value] = line.split("=").map((part) => part.trim());

      if (!key) {
        return null;
      }

      if (value && value.startsWith("ssm:")) {
        const ssmPath = value.slice(4).trim();

        if (ssmPath) {
          const ssmVar: EnvVariable = {
            type: "ssm",
            name: key,
            path: ssmPath,
            value: undefined,
          };

          return ssmVar;
        }
      }

      const valueVar: EnvVariable = {
        type: "value",
        name: key,
        value: value || undefined,
      };

      return valueVar;
    })
    .filter((envVar) => !!envVar);
}

export function enrichWithSsmParams(
  envVars: EnvVariable[],
  ssmParams: Parameter[] = []
): EnvVariable[] {
  return envVars.map((envVar) => {
    if (envVar.type === "ssm") {
      const param = ssmParams.find((p) => p.Name === envVar.path);

      return {
        ...envVar,
        value: param?.Value,
      };
    }

    return envVar;
  });
}

export function formatEnvVarsAsString(envVars: EnvVariable[]) {
  const result = envVars
    .map((envVar) => {
      if (envVar.type === "comment") {
        return envVar.value; // Return comment as is
      }

      if (envVar.type === "other") {
        return `# ${envVar.value}`;
      }

      if (envVar.type === "ssm") {
        if (envVar.value) {
          return `${envVar.name}=${envVar.value}`;
        }

        return `${envVar.name}= # ssm:${envVar.path} not found`;
      }

      return `${envVar.name}=${envVar.value || ""}`;
    })
    .join("\n");

  if (result) {
    return result + "\n"; // Ensure the output ends with a newline
  }

  return "";
}
