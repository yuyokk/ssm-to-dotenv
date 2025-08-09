import { describe, expect, test } from "vitest";
import {
  ParsedEnvVars,
  parseInput,
  enrichEnvVarsWithSsmParams,
  normalizeEnvVars,
  envVarsToLines,
  EnvVars,
  SSM_VALUE_NOT_FOUND,
} from "./index.js";
import { Parameter } from "@aws-sdk/client-ssm";

describe("parseInput", () => {
  test("should parse ssm param correctly", () => {
    const input = `
VARIABLE_1=ssm:/some/var/name/1
`;
    const result = parseInput(input);

    expect(result.VARIABLE_1).toEqual({
      type: "ssm",
      path: "/some/var/name/1",
      value: undefined,
    });
  });

  test("should ignore ssm param without value", () => {
    const input = `VARIABLE_1=ssm:`;
    const result = parseInput(input);

    expect(result.VARIABLE_1).toEqual({
      type: "value",
      value: "ssm:",
    });
  });

  test("should regular parse value correctly", () => {
    const input = `VARIABLE=some-value`;

    const result = parseInput(input);
    expect(result.VARIABLE).toEqual({
      type: "value",
      value: "some-value",
    });
  });

  test("should handle empty values", () => {
    const input = `VARIABLE_WITH_EMPTY_VALUE=`;
    const result = parseInput(input);

    expect(result.VARIABLE_WITH_EMPTY_VALUE).toEqual({
      type: "value",
      value: undefined,
    });
  });

  test("should ignore empty lines", () => {
    const input = `VARIABLE_1=ssm:/some/var/name/1
VARIABLE_2=some-value
VARIABLE_3=

VARIABLE_4=`;

    const result = parseInput(input);

    expect(result).toEqual({
      VARIABLE_1: {
        type: "ssm",
        path: "/some/var/name/1",
        value: undefined,
      },
      VARIABLE_2: {
        type: "value",
        value: "some-value",
      },
      VARIABLE_3: {
        type: "value",
        value: undefined,
      },
      VARIABLE_4: {
        type: "value",
        value: undefined,
      },
    });
  });

  test("should trim whitespace from keys and values", () => {
    const input = `  VARIABLE_1 = ssm:/some/var/name/1
  VARIABLE_2 = some-value  `;

    const result = parseInput(input);

    expect(result).toEqual({
      VARIABLE_1: {
        type: "ssm",
        path: "/some/var/name/1",
        value: undefined,
      },
      VARIABLE_2: {
        type: "value",
        value: "some-value",
      },
    });
  });
});

describe("enrichEnvVarsWithSsmParams", () => {
  test("should enrich SSM env vars with values from ssmParams", () => {
    const envVars: ParsedEnvVars = {
      VARIABLE_1: {
        type: "ssm",
        path: "/ssm/path/1",
        value: undefined,
      },
      VARIABLE_2: { type: "value", value: "plain-value" },
      VARIABLE_3: {
        type: "ssm",
        path: "/ssm/path/2",
        value: undefined,
      },
    };
    const ssmParams: Parameter[] = [
      { Name: "/ssm/path/1", Value: "resolved-1" },
      { Name: "/ssm/path/2", Value: "resolved-2" },
    ];

    const result = enrichEnvVarsWithSsmParams(envVars, ssmParams);

    expect(result).toEqual({
      VARIABLE_1: { type: "ssm", path: "/ssm/path/1", value: "resolved-1" },
      VARIABLE_2: { type: "value", value: "plain-value" },
      VARIABLE_3: { type: "ssm", path: "/ssm/path/2", value: "resolved-2" },
    });
  });

  test("should not modify value env vars", () => {
    const envVars: ParsedEnvVars = {
      VARIABLE_1: { type: "value", value: "plain-value" },
    };

    const ssmParams: Parameter[] = [
      { Name: "/ssm/path/1", Value: "resolved-1" },
    ];

    const result = enrichEnvVarsWithSsmParams(envVars, ssmParams);

    expect(result).toEqual({
      VARIABLE_1: { type: "value", value: "plain-value" },
    });
  });

  test("should leave SSM env vars value undefined if not found in ssmParams", () => {
    const envVars: ParsedEnvVars = {
      VARIABLE_1: {
        type: "ssm",
        path: "/ssm/path/1",
        value: undefined,
      },
    };

    const ssmParams: { Name: string; Value: string }[] = [];
    const result = enrichEnvVarsWithSsmParams(envVars, ssmParams);
    expect(result).toEqual({
      VARIABLE_1: { type: "ssm", path: "/ssm/path/1", value: undefined },
    });
  });
});

describe("normalizeEnvVars", () => {
  test("should handle empty input", () => {
    const envVars: ParsedEnvVars = {};

    const result = normalizeEnvVars(envVars);

    expect(result).toEqual({});
  });

  test("should normalize value env vars", () => {
    const envVars: ParsedEnvVars = {
      FOO: { type: "value", value: "bar" },
      BAZ: { type: "value", value: "qux" },
    };

    const result = normalizeEnvVars(envVars);

    expect(result).toEqual({ FOO: "bar", BAZ: "qux" });
  });

  test("should normalize ssm env vars with value", () => {
    const envVars: ParsedEnvVars = {
      FOO: { type: "ssm", path: "/ssm/foo", value: "bar" },
    };

    const result = normalizeEnvVars(envVars);

    expect(result).toEqual({ FOO: "bar" });
  });

  test("should normalize ssm env vars with missing value", () => {
    const envVars: ParsedEnvVars = {
      FOO: { type: "ssm", path: "/ssm/foo", value: undefined },
    };

    const result = normalizeEnvVars(envVars);

    expect(result.FOO).toBe(SSM_VALUE_NOT_FOUND);
  });

  test("should handle mixed and empty input", () => {
    const envVars: ParsedEnvVars = {
      FOO: { type: "value", value: undefined },
      BAR: { type: "ssm", path: "/ssm/bar", value: undefined },
    };

    const result = normalizeEnvVars(envVars);
    expect(result.FOO).toBeUndefined();
    expect(result.BAR).toBe(SSM_VALUE_NOT_FOUND);
  });
});

describe("envVarsToLines", () => {
  test("should convert env vars object to lines", () => {
    const envVars: EnvVars = {
      FOO: "bar",
      BAZ: "qux",
    };
    const result = envVarsToLines(envVars);
    expect(result).toBe("FOO=bar\nBAZ=qux");
  });

  test("should handle empty object", () => {
    const envVars: EnvVars = {};

    const result = envVarsToLines(envVars);

    expect(result).toBe("");
  });

  test("should output empty string for undefined values", () => {
    const envVars: EnvVars = {
      FOO: undefined,
      BAR: "baz",
    };

    const result = envVarsToLines(envVars);

    expect(result).toBe("FOO=\nBAR=baz");
  });
});
