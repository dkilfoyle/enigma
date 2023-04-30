import { assert, expect, test } from "vitest";
import { Enigma } from "./enigma";

test("Default Enigma encodes correctly", () => {
  const e = new Enigma(["I", "II", "III"], "B", [0, 0, 0], [0, 0, 0], "");
  const input = "ABC";
  const output = "BJE";
  const ciphertext = e.encryptString(input);
  expect(ciphertext).toBe(output);
});
