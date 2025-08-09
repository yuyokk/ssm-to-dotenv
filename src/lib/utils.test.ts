import { describe, expect, test } from "vitest";
import {
  parseCliArgs,
  parseInput,
  enrichWithSsmParams,
  formatEnvVarsAsString,
} from "./utils.js";
import { EnvVariable } from "./utils.js";
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
  describe("regular env vars", () => {
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
  });

  describe("ssm env vars", () => {
    test("happy path", () => {
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

    test("should ignore ssm param without path", () => {
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
  });

  describe("comments", () => {
    test("happy path", () => {
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

  test("should treat lines without equal sign as other", () => {
    const input = `# This is a comment
VARIABLE_2`;

    const result = parseInput(input);

    expect(result).toEqual([
      {
        type: "comment",
        value: "# This is a comment",
      },
      {
        type: "other",
        value: "VARIABLE_2",
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
});

describe("enrichWithSsmParams", () => {
  test("should enrich SSM lines with values from ssmParams", () => {
    const lines: EnvVariable[] = [
      { type: "ssm", name: "FOO", path: "/ssm/foo", value: undefined },
      { type: "value", name: "BAR", value: "baz" },
      { type: "ssm", name: "BAZ", path: "/ssm/baz", value: undefined },
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

describe("formatEnvVarsAsString", () => {
  describe("regular env vars", () => {
    test("happy path", () => {
      const envVars: EnvVariable[] = [
        { type: "value", name: "FOO", value: "bar" },
        { type: "value", name: "BAZ", value: "qux" },
        { type: "value", name: "BAR", value: undefined },
      ];

      expect(formatEnvVarsAsString(envVars)).toMatchSnapshot();
    });
  });

  describe("ssm env vars", () => {
    test("happy path", () => {
      const envVars: EnvVariable[] = [
        { type: "ssm", name: "FOO", path: "/ssm/foo", value: "bar" },
        { type: "ssm", name: "BAZ", path: "/ssm/foo", value: undefined },
      ];

      expect(formatEnvVarsAsString(envVars)).toMatchSnapshot();
    });
  });

  test("should handle different env vars", () => {
    const lines: EnvVariable[] = [
      { type: "comment", value: "# This is a comment 1" },
      { type: "value", name: "VAR_1", value: "bar" },
      { type: "comment", value: "# This is a comment 2" },
      { type: "ssm", name: "VAR_2", path: "/ssm/var2", value: "bar" },
      { type: "ssm", name: "VAR_3", path: "/ssm/va3", value: undefined },
      { type: "value", name: "VAR_4", value: undefined },
      { type: "other", value: "SOMETHING_HERE" },
    ];

    expect(formatEnvVarsAsString(lines)).toMatchSnapshot();
  });

  test("should handle empty input", () => {
    expect(formatEnvVarsAsString([])).toBe("");
  });
});
