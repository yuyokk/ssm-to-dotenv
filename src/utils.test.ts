import { describe, expect, test } from "vitest";
import { SSM_VALUE_NOT_FOUND } from "./constants.js";
import {
  parseCliArgs,
  parseInput,
  enrichWithSsmParams,
  normalizeEnvVariables,
  formatEnvVarsAsString,
} from "./utils.js";
import { EnvVariable } from "./types.js";
import { Parameter } from "@aws-sdk/client-ssm";

describe("parseCliArgs", () => {
  test("should parse single CLI arg with value", () => {
    const args = ["--foo=bar"];
    const result = parseCliArgs(args);
    expect(result).toEqual({ foo: "bar" });
  });

  test("should parse multiple CLI args", () => {
    const args = ["--foo=bar", "--baz=qux"];
    const result = parseCliArgs(args);
    expect(result).toEqual({ foo: "bar", baz: "qux" });
  });

  test("should handle flags without value as true", () => {
    const args = ["--flag"];
    const result = parseCliArgs(args);
    expect(result).toEqual({ flag: true });
  });

  test("should ignore non -- arguments", () => {
    const args = ["foo", "--bar=baz"];
    const result = parseCliArgs(args);
    expect(result).toEqual({ bar: "baz" });
  });

  test("should handle empty input", () => {
    const args: string[] = [];
    const result = parseCliArgs(args);
    expect(result).toEqual({});
  });
});

describe("parseInput", () => {
  test("should parse ssm param correctly", () => {
    const input = `
VARIABLE_1=ssm:/some/var/name/1
`;
    const result = parseInput(input);

    expect(result).toEqual([
      {
        type: "ssm",
        name: "VARIABLE_1",
        path: "/some/var/name/1",
        value: undefined,
      },
    ]);
  });

  test("should ignore ssm param without value", () => {
    const input = `VARIABLE_1=ssm:`;
    const result = parseInput(input);

    expect(result).toEqual([
      {
        type: "value",
        name: "VARIABLE_1",
        value: "ssm:",
      },
    ]);
  });

  test("should regular parse value correctly", () => {
    const input = `VARIABLE=some-value`;

    const result = parseInput(input);
    expect(result).toEqual([
      {
        type: "value",
        name: "VARIABLE",
        value: "some-value",
      },
    ]);
  });

  test("should handle empty values", () => {
    const input = `VARIABLE_WITH_EMPTY_VALUE=`;
    const result = parseInput(input);

    expect(result).toEqual([
      {
        type: "value",
        name: "VARIABLE_WITH_EMPTY_VALUE",
        value: undefined,
      },
    ]);
  });

  test("should ignore empty lines", () => {
    const input = `VARIABLE_1=ssm:/some/var/name/1
VARIABLE_2=some-value
VARIABLE_3=

VARIABLE_4=`;

    const result = parseInput(input);

    expect(result).toEqual([
      {
        type: "ssm",
        name: "VARIABLE_1",
        path: "/some/var/name/1",
        value: undefined,
      },
      {
        type: "value",
        name: "VARIABLE_2",
        value: "some-value",
      },
      {
        type: "value",
        name: "VARIABLE_3",
        value: undefined,
      },
      {
        type: "value",
        name: "VARIABLE_4",
        value: undefined,
      },
    ]);
  });

  test("should trim whitespace from keys and values", () => {
    const input = `  VARIABLE_1 = ssm:/some/var/name/1
  VARIABLE_2 = some-value  `;

    const result = parseInput(input);

    expect(result).toEqual([
      {
        type: "ssm",
        name: "VARIABLE_1",
        path: "/some/var/name/1",
        value: undefined,
      },
      {
        type: "value",
        name: "VARIABLE_2",
        value: "some-value",
      },
    ]);
  });

  test("should handle comments", () => {
    const input = `# This is a comment
VARIABLE_1=ssm:/some/var/name/1
# Another comment
VARIABLE_2=some-value`;

    const result = parseInput(input);

    expect(result).toEqual([
      {
        type: "comment",
        value: "# This is a comment",
      },
      {
        name: "VARIABLE_1",
        path: "/some/var/name/1",
        type: "ssm",
        value: undefined,
      },
      {
        type: "comment",
        value: "# Another comment",
      },
      {
        name: "VARIABLE_2",
        type: "value",
        value: "some-value",
      },
    ]);
  });
});

describe("enrichWithSsmParams", () => {
  test("should enrich SSM lines with values from ssmParams", () => {
    const lines: EnvVariable[] = [
      { type: "ssm", name: "FOO", path: "/ssm/foo", value: "" },
      { type: "value", name: "BAR", value: "baz" },
      { type: "ssm", name: "BAZ", path: "/ssm/baz", value: "" },
    ];
    const ssmParams: Parameter[] = [
      { Name: "/ssm/foo", Value: "resolved-foo" },
      { Name: "/ssm/baz", Value: "resolved-baz" },
    ];

    const result = enrichWithSsmParams(lines, ssmParams);

    expect(result).toEqual([
      { type: "ssm", name: "FOO", path: "/ssm/foo", value: "resolved-foo" },
      { type: "value", name: "BAR", value: "baz" },
      { type: "ssm", name: "BAZ", path: "/ssm/baz", value: "resolved-baz" },
    ]);
  });

  test("should not modify value or comment lines", () => {
    const lines: EnvVariable[] = [
      { type: "value", name: "FOO", value: "bar" },
      { type: "comment", value: "# comment" },
    ];
    const ssmParams: Parameter[] = [
      { Name: "/ssm/foo", Value: "resolved-foo" },
    ];

    const result = enrichWithSsmParams(lines, ssmParams);

    expect(result).toEqual([
      { type: "value", name: "FOO", value: "bar" },
      { type: "comment", value: "# comment" },
    ]);
  });
});

describe("normalizeEnvVariables", () => {
  test("should normalize value env vars", () => {
    const lines: EnvVariable[] = [
      { type: "value", name: "FOO", value: "bar" },
      { type: "value", name: "BAZ", value: "qux" },
    ];
    const result = normalizeEnvVariables(lines);
    expect(result).toEqual([
      { type: "value", name: "FOO", value: "bar" },
      { type: "value", name: "BAZ", value: "qux" },
    ]);
  });

  test("should normalize ssm env vars with value", () => {
    const lines: EnvVariable[] = [
      { type: "ssm", name: "FOO", path: "/ssm/foo", value: "bar" },
    ];
    const result = normalizeEnvVariables(lines);
    expect(result).toEqual([
      { type: "ssm", name: "FOO", path: "/ssm/foo", value: "bar" },
    ]);
  });

  test("should normalize ssm env vars with missing value", () => {
    const lines: EnvVariable[] = [
      { type: "ssm", name: "FOO", path: "/ssm/foo", value: "" },
    ];
    const result = normalizeEnvVariables(lines);
    expect(result).toEqual([
      {
        type: "ssm",
        name: "FOO",
        path: "/ssm/foo",
        value: SSM_VALUE_NOT_FOUND,
      },
    ]);
  });

  test("should handle mixed and empty input", () => {
    expect(normalizeEnvVariables([])).toEqual([]);
    const lines: EnvVariable[] = [
      { type: "value", name: "FOO", value: "" },
      { type: "ssm", name: "BAR", path: "/ssm/bar", value: "" },
    ];
    const result = normalizeEnvVariables(lines);
    expect(result).toEqual([
      { type: "value", name: "FOO", value: "" },
      {
        type: "ssm",
        name: "BAR",
        path: "/ssm/bar",
        value: SSM_VALUE_NOT_FOUND,
      },
    ]);
  });
});

describe("formatEnvVarsAsString", () => {
  test("should format value lines", () => {
    const lines: EnvVariable[] = [
      { type: "value", name: "FOO", value: "bar" },
      { type: "value", name: "BAZ", value: "qux" },
    ];

    expect(formatEnvVarsAsString(lines)).toBe("FOO=bar\nBAZ=qux\n");
  });

  test("should format ssm lines", () => {
    const lines: EnvVariable[] = [
      { type: "ssm", name: "FOO", path: "/ssm/foo", value: "bar" },
    ];

    expect(formatEnvVarsAsString(lines)).toBe("FOO=bar\n");
  });

  test("should format comment lines", () => {
    const lines: EnvVariable[] = [
      { type: "comment", value: "# This is a comment" },
      { type: "value", name: "FOO", value: "bar" },
    ];

    expect(formatEnvVarsAsString(lines)).toBe("# This is a comment\nFOO=bar\n");
  });

  test("should handle mixed and empty input", () => {
    const lines: EnvVariable[] = [
      { type: "value", name: "FOO", value: "" },
      { type: "ssm", name: "BAR", path: "/ssm/bar", value: "" },
    ];

    expect(formatEnvVarsAsString(lines)).toBe("FOO=\nBAR=\n");
  });

  test("should handle empty input", () => {
    expect(formatEnvVarsAsString([])).toBe("");
  });
});
