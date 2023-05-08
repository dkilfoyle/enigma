import _ from "lodash";
import { Enigma, IEnigmaKey } from "../encode/enigma";
import { getIOC, getBigrams } from "./Fitness";

const testRotorPositions = async (id: number, rotors: string[], ciphertext: string) => {
  const optimalKey: IEnigmaKey = {
    rotors,
    rotorPositions: [0, 0, 0],
    ringSettings: [0, 0, 0],
  };
  const enigma = Enigma.createFromKey(optimalKey);
  let bestIOC = 0;

  const az = _.range(0, 26);
  for (const leftStartPosition of az) {
    // await new Promise((resolve) => setTimeout(resolve, 10)); // 3 sec
    for (const middleStartPosition of az) {
      self.postMessage({
        action: "reportProgress",
        payload: {
          enigmaId: id,
          progress: ((25 + middleStartPosition * 25 + leftStartPosition * 25 * 25) / (25 * 25 * 25)) * 80,
        },
      });
      for (const rightStartPosition of az) {
        enigma.setRotorPositions(leftStartPosition, middleStartPosition, rightStartPosition);

        // "encrypting" the ciphertext gives back the plaintext

        const plainText = enigma.encryptString(ciphertext);
        const ioc = getIOC(plainText);
        if (ioc > bestIOC) {
          bestIOC = ioc;
          optimalKey.rotorPositions = [leftStartPosition, middleStartPosition, rightStartPosition];
          optimalKey.ringSettings = enigma.getRingSettings();
          self.postMessage({
            action: "reportIOC",
            payload: {
              enigmaId: id,
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

const testRingSetting = (id: number, key: IEnigmaKey, ciphertext: string, rotor: "right" | "middle") => {
  let bestFit = -1000000000000000000000000000;
  let bestRingSetting = -1;
  for (let i = 0; i < 26; i++) {
    const e = Enigma.createFromKey(key);
    const r = rotor == "right" ? e.rightRotor : e.middleRotor;
    r.rotorPosition = (r.rotorPosition + i) % 26;
    r.ringSetting = i;
    const plainText = e.encryptString(ciphertext);
    const bigramFit = getBigrams(plainText);
    // console.log(`${id}: ${i} = ${bigramFit}`, key.rotorPositions, e.getRingSettings(), e.getRotorPositions());
    if (bigramFit > bestFit) {
      bestFit = bigramFit;
      bestRingSetting = i;
    }
  }
  return bestRingSetting;
};

const testRingSettings = (id: number, key: IEnigmaKey, ciphertext: string) => {
  const rightKey = _.cloneDeep(key);
  const rightOptimalRingSetting = testRingSetting(id, rightKey, ciphertext, "right");

  const middleKey = _.cloneDeep(rightKey);
  middleKey.ringSettings = [0, 0, rightOptimalRingSetting];
  middleKey.rotorPositions[2] = (middleKey.rotorPositions[2] + middleKey.ringSettings[2]) % 26; // starting position

  self.postMessage({
    action: "reportProgress",
    payload: {
      enigmaId: id,
      progress: 90,
    },
  });

  const middleOptimalRingSetting = testRingSetting(id, middleKey, ciphertext, "middle");

  const optimKey = _.cloneDeep(key);
  optimKey.ringSettings = [0, middleOptimalRingSetting, rightOptimalRingSetting];

  self.postMessage({
    action: "reportProgress",
    payload: {
      enigmaId: id,
      progress: 100,
    },
  });

  return optimKey;
};

onmessage = async ({ data }) => {
  const { action, payload } = data;
  switch (action) {
    case "testRotorPositions": {
      // setTimeout(() => {
      const optimalKey1 = await testRotorPositions(payload.enigmaId, payload.rotors, payload.ciphertext);
      const optimalKey2 = testRingSettings(payload.enigmaId, optimalKey1, payload.ciphertext);
      const e = Enigma.createFromKey(optimalKey2);
      const decryption = e.encryptString(payload.ciphertext);
      self.postMessage({
        action: "doneRotors",
        payload: {
          enigmaId: payload.enigmaId,
          bigram: getBigrams(decryption),
          key: optimalKey2,
        },
      });
      // }, 0);

      break;
    }
  }
};
