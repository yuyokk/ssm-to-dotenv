import { describe, expect, test } from "vitest";
import { parseInput } from "./index.js";

describe("parseInput", () => {
  test("happy path", () => {
    const input = `
VARIABLE_1=ssm:/some/var/name/1
VARIABLE_2=ssm:/some/var/name/2
VARIABLE_3=SOME_OTHER_VALUE
VARIABLE_4=
`;
    const result = parseInput(input);
    const expected = {
      VARIABLE_1: "ssm:/some/var/name/1",
      VARIABLE_2: "ssm:/some/var/name/2",
      VARIABLE_3: "SOME_OTHER_VALUE",
      VARIABLE_4: "",
    };

    expect(result).toEqual(expected);
  });
});
