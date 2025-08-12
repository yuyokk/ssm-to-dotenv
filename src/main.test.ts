import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import * as ssm from "./lib/ssm-client.js";
import { handler } from "./main.js";
import fs from "node:fs/promises";

vi.mock("node:fs/promises");
vi.mock("./lib/ssm-client.js");

describe("Basic int test", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // restoring date after each test run
    vi.useRealTimers();
  });

  test("happy path", async () => {
    const inputEnv = `# This is a comment
VAR1=value1
VAR2=value2 # with comment
VAR3=value3

VAR_WITH_LONG_VALUE=Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua
VAR_WITHOUT_VALUE=
# Another comment

VAR1_WITH_SSM=ssm:/path/to/param1
VAR2_WITH_SSM=ssm:/path/to/param2
VAR_WITH_SSM_WITH_COMMENT=ssm:/path/to/missing # comment
VAR_WITH_SSM_PREFIX_ONLY=ssm:

VAR_WITHOUT_EQUAL_SIGN
# This is a comment

`;

    const expectedOutput = `# Created at 2025-08-11T20:36:38.586Z
# ---
# This is a comment
VAR1=value1
VAR2=value2 # with comment
VAR3=value3
VAR_WITH_LONG_VALUE=Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua
VAR_WITHOUT_VALUE=
# Another comment
VAR1_WITH_SSM=param1-value
VAR2_WITH_SSM=param2-value
VAR_WITH_SSM_WITH_COMMENT= # ssm:/path/to/missing not found # comment
VAR_WITH_SSM_PREFIX_ONLY=ssm:
# VAR_WITHOUT_EQUAL_SIGN
# This is a comment
`;

    // mock date
    const date = new Date("2025-08-11T20:36:38.586Z");
    vi.setSystemTime(date);

    // mock fs.readFile and fs.writeFile
    fs.readFile = vi.fn().mockResolvedValue(inputEnv);
    fs.writeFile = vi.fn();

    // mock ssm.getSsmParams
    // @ts-expect-error - return mock value for getSsmParams
    ssm.getParams = vi.fn().mockResolvedValue([
      { Name: "/path/to/param1", Value: "param1-value" },
      { Name: "/path/to/param2", Value: "param2-value" },
    ]);

    await handler();

    expect(fs.readFile).toHaveBeenCalledWith(".env.example", "utf-8");
    expect(fs.writeFile).toHaveBeenCalledWith(
      ".env.local",
      expectedOutput,
      "utf-8"
    );
  });
});
