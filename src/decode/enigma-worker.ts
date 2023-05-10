import _ from "lodash";
import { Enigma, IEnigmaKey } from "../encode/enigma";
import { getIOC, getBigrams } from "./Fitness";

const reportProgress = (id: number, progress: number) => {
  self.postMessage({
    action: "reportRotorProgress",
    payload: {
      id,
      progress,
    },
  });
};

const testRotorPositions = async (id: number, rotors: string[], ciphertext: string) => {
  const optimalKey: IEnigmaKey = {
    rotors,
    rotorIndicators: [0, 0, 0],
    ringSettings: [0, 0, 0],
    plugboard: "",
  };
  const enigma = Enigma.createFromKey(optimalKey);
  let bestIOC = 0;

  const az = _.range(0, 26);
  for (const leftStartPosition of az) {
    // await new Promise((resolve) => setTimeout(resolve, 10)); // 3 sec
    for (const middleStartPosition of az) {
      reportProgress(id, ((25 + middleStartPosition * 25 + leftStartPosition * 25 * 25) / (25 * 25 * 25)) * 80);

      for (const rightStartPosition of az) {
        enigma.setRotorPositions(leftStartPosition, middleStartPosition, rightStartPosition);

        // "encrypting" the ciphertext gives back the plaintext

        const plainText = enigma.encryptString(ciphertext);
        const ioc = getIOC(plainText);
        if (ioc > bestIOC) {
          bestIOC = ioc;
          optimalKey.rotorIndicators = [leftStartPosition, middleStartPosition, rightStartPosition];
          optimalKey.ringSettings = enigma.getRingSettings();
          self.postMessage({
            action: "reportRotorSettings",
            payload: {
              id: id,
              ioc,
              key: optimalKey,
            },
          });
        }
      }
    }
  }

  return optimalKey;
};

const testRingSetting = (id: number, key: IEnigmaKey, ciphertext: string, rotor: number) => {
  let bestFit = -1000000000000000000000000000;
  let bestRingSetting = -1;

  const originalIndicators = key.rotorIndicators;
  const originalRingSettings = key.ringSettings;

  for (let i = 0; i < 26; i++) {
    const currentStartingPositions = [...originalIndicators];
    const currentRingsSettings = [...originalRingSettings];

    currentStartingPositions[rotor] = (currentStartingPositions[rotor] + i) % 26;
    currentRingsSettings[rotor] = i;

    const e = new Enigma(key.rotors, "B", currentStartingPositions, currentRingsSettings, "");
    const plainText = e.encryptString(ciphertext);
    const bigramFit = getBigrams(plainText);

    if (bigramFit > bestFit) {
      bestFit = bigramFit;
      bestRingSetting = i;
    }
  }
  return bestRingSetting;
};

const testRingSettings = (id: number, key: IEnigmaKey, ciphertext: string) => {
  const newKey = _.cloneDeep(key);

  // optimise right rotor
  const rightOptimalRingSetting = testRingSetting(id, newKey, ciphertext, 2);
  newKey.ringSettings[2] = rightOptimalRingSetting;
  newKey.rotorIndicators[2] = (newKey.rotorIndicators[2] + rightOptimalRingSetting) % 26;
  reportProgress(id, 90);

  // optimise middle rotor
  const middleOptimalRingSetting = testRingSetting(id, newKey, ciphertext, 1);
  newKey.ringSettings[1] = middleOptimalRingSetting;
  newKey.rotorIndicators[1] = (newKey.rotorIndicators[1] + middleOptimalRingSetting) % 26;
  reportProgress(id, 100);

  return newKey;
};

onmessage = async ({ data }) => {
  const { action, payload } = data;
  switch (action) {
    case "testRotorPositions": {
      const optimalKey1 = await testRotorPositions(payload.id, payload.rotors, payload.ciphertext);
      const optimalKey2 = testRingSettings(payload.id, optimalKey1, payload.ciphertext);
      const e = Enigma.createFromKey(optimalKey2);
      const decryption = e.encryptString(payload.ciphertext);
      self.postMessage({
        action: "reportRotorSettings",
        payload: {
          id: payload.id,
          key: optimalKey2,
          ioc: getIOC(decryption),
          finished: true,
        },
      });
      break;
    }
    default:
      throw Error(`enigma-worker onmessage unknown action ${action}`);
  }
};
