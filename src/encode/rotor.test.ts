import { assert, expect, test } from "vitest";
import { Rotor } from "./rotor";

// 0  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25
// A  B  C  D  E  F  G  H  I  J  K  L  M  N  O  P  Q  R  S  T  U  V  W  X  Y  Z

// 4  10 12 5  11 6  3  16 21 25 13 19                                  17 2  9
// E  K  M  F  L  G  D  Q  V  Z  N  T  O  W  Y  H  X  U  S  P  A  I  B  R  C  J

// 9  11 4  10 5                                                                  3
//

// 10 3  9  4  1

// 0 1  2 3 4 5
// 4 10

// ZABCDEFGHIJKLMNOPQRSTUVWXY
// EKMFLGDQVZNTOWYHXUSPAIBRCJ

// test("Forward encipher", () => {
//   const rotorI = new Rotor("I", 0, 0);
//   expect(rotorI.forward("A".charCodeAt(0) - 65)).toBe("E".charCodeAt(0) - 65);
//   expect(rotorI.forward("B".charCodeAt(0) - 65)).toBe("K".charCodeAt(0) - 65);
//   expect(rotorI.forward("C".charCodeAt(0) - 65)).toBe("M".charCodeAt(0) - 65);
//   expect(rotorI.forward("D".charCodeAt(0) - 65)).toBe("F".charCodeAt(0) - 65);
//   expect(rotorI.forward("E".charCodeAt(0) - 65)).toBe("L".charCodeAt(0) - 65);
//   expect(rotorI.forward("Z".charCodeAt(0) - 65)).toBe("J".charCodeAt(0) - 65);
// });

// test("Backward encipher", () => {
//   const rotorI = new Rotor("I", 0, 0);
//   expect(rotorI.backward("E".charCodeAt(0) - 65)).toBe("A".charCodeAt(0) - 65);
//   expect(rotorI.backward("K".charCodeAt(0) - 65)).toBe("B".charCodeAt(0) - 65);
//   expect(rotorI.backward("M".charCodeAt(0) - 65)).toBe("C".charCodeAt(0) - 65);
//   expect(rotorI.backward("F".charCodeAt(0) - 65)).toBe("D".charCodeAt(0) - 65);
//   expect(rotorI.backward("J".charCodeAt(0) - 65)).toBe("Z".charCodeAt(0) - 65);
// });

// test("Turnover", () => {
//   const rotorI = new Rotor("I", 0, 0);
//   console.log("A", rotorI.forward("A".charCodeAt(0) - 65));
//   console.log("B", rotorI.forward("B".charCodeAt(0) - 65));
//   console.log("C", rotorI.forward("C".charCodeAt(0) - 65));
//   console.log("Z", rotorI.forward("Z".charCodeAt(0) - 65));
//   rotorI.turnover();
//   console.log("A", rotorI.forward("A".charCodeAt(0) - 65));
//   console.log("B", rotorI.forward("B".charCodeAt(0) - 65));
//   console.log("C", rotorI.forward("C".charCodeAt(0) - 65));
//   console.log("Z", rotorI.forward("Z".charCodeAt(0) - 65));
//   // expect(rotorI.forward("G".charCodeAt(0) - 65)).toBe("D".charCodeAt(0) - 65);
//   // expect(rotorI.forward("G".charCodeAt(0) - 65)).toBe("E".charCodeAt(0) - 65);
//   // expect(rotorI.forward("A".charCodeAt(0) - 65)).toBe("E".charCodeAt(0) - 65);
//   // expect(rotorI.forward("B".charCodeAt(0) - 65)).toBe("E".charCodeAt(0) - 65);
//   // expect(rotorI.forward("Z".charCodeAt(0) - 65)).toBe("C".charCodeAt(0) - 65);
// });
