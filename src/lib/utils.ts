import { Parameter } from "@aws-sdk/client-ssm";

export type EnvVariable =
  | {
      type: "value";
      name: string;
      value: string | undefined;
      comment: string | undefined;
    }
  | {
      type: "ssm";
      name: string;
      path: string;
      value: string | undefined;
      comment: string | undefined;
    }
  | {
      type: "comment";
      comment: string;
    };

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
      // This is a comment line
      if (line.startsWith("#")) {
        const commentVar: EnvVariable = {
          type: "comment",
          comment: line.slice(1).trim(), // Remove the leading '#'
        };

        return commentVar;
      }

      // This is "weird" line without an equal sign
      if (!line.includes("=")) {
        const otherVar: EnvVariable = {
          type: "comment",
          comment: line,
        };

        return otherVar;
      }

      const [key, valueWithPossibleComment] = line
        .split("=")
        .map((part) => part.trim());
      const [value, comment] = valueWithPossibleComment
        .split("#")
        .map((part) => part.trim());

      if (value && value.startsWith("ssm:")) {
        const ssmPath = value.slice(4).trim();

        if (ssmPath) {
          const ssmVar: EnvVariable = {
            type: "ssm",
            name: key,
            path: ssmPath,
            comment: comment,
            value: undefined,
          };

          return ssmVar;
        }
      }

      const valueVar: EnvVariable = {
        type: "value",
        name: key,
        comment: comment,
        value: value,
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
        return `# ${envVar.comment}`;
      }

      if (envVar.type === "ssm") {
        if (envVar.value) {
          return appendComment(
            `${envVar.name}=${envVar.value}`,
            envVar.comment
          );
        }

        return appendComment(
          appendComment(`${envVar.name}=`, `ssm:${envVar.path} not found`),
          envVar.comment
        );
      }

      return appendComment(`${envVar.name}=${envVar.value}`, envVar.comment);
    })
    .join("\n");

  if (result) {
    return result + "\n"; // Ensure the output ends with a newline
  }

  return "";
}

function appendComment(value: string, comment: string | undefined) {
  if (comment) {
    return `${value} # ${comment}`;
  }

  return value;
}
