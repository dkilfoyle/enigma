import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import Odometer from "react-odometerjs";

import { Box, Button, ChakraProvider, Grid, GridItem, HStack, Progress, SimpleGrid, Stack, VStack } from "@chakra-ui/react";
import _ from "lodash";
import { useImmer } from "use-immer";

const availRotors = ["I", "II", "III", "IV", "V"];
const rotorCombinationsAll: string[][] = [];
for (const r1 of availRotors) {
  for (const r2 of availRotors) {
    if (r1 == r2) continue;
    for (const r3 of availRotors) {
      if (r1 == r3 || r2 == r3) continue;
      rotorCombinationsAll.push([r3, r2, r1]);
    }
  }
}
const rotorCombinations = rotorCombinationsAll.slice(0, 48);

// const rotorCombinations = [["II", "V", "III"]];

const ciphertext =
  "OZLUDYAKMGMXVFVARPMJIKVWPMBVWMOIDHYPLAYUWGBZFAFAFUQFZQISLEZMYPVBRDDLAGIHIFUJDFADORQOOMIZPYXDCBPWDSSNUSYZTJEWZPWFBWBMIEQXRFASZLOPPZRJKJSPPSTXKPUWYSKNMZZLHJDXJMMMDFODIHUBVCXMNICNYQBNQODFQLOGPZYXRJMTLMRKQAUQJPADHDZPFIKTQBFXAYMVSZPKXIQLOQCVRPKOBZSXIUBAAJBRSNAFDMLLBVSYXISFXQZKQJRIQHOSHVYJXIFUZRMXWJVWHCCYHCXYGRKMKBPWRDBXXRGABQBZRJDVHFPJZUSEBHWAEOGEUQFZEEBDCWNDHIAQDMHKPRVYHQGRDYQIOEOLUBGBSNXWPZCHLDZQBWBEWOCQDBAFGUVHNGCIKXEIZGIZHPJFCTMNNNAUXEVWTWACHOLOLSLTMDRZJZEVKKSSGUUTHVXXODSKTFGRUEIIXVWQYUIPIDBFPGLBYXZTCOQBCAHJYNSGDYLREYBRAKXGKQKWJEKWGAPTHGOMXJDSQKYHMFGOLXBSKVLGNZOAXGVTGXUIVFTGKPJU";

interface IRotorSetting {
  enigmaId: number;
  ioc: number;
  bigram: number;
  rotorPositions: number[];
  ringSettings: number[];
  progress: number;
}

const scaleIOC = (ioc: number) => {
  const iocRandom = 0.038466;
  const iocEnglish = 0.066332 * 0.8;
  return (ioc - iocRandom) / (iocEnglish - iocRandom);
};

const colorIOC = (ioc: number) => {
  return `rgb(255,255,255 / ${Math.max(scaleIOC(ioc), 0) * 100}%)`;
};

function App() {
  const [rotorSettings, setRotorSettings] = useImmer<IRotorSetting[]>(
    rotorCombinations.map((rc, i) => ({
      enigmaId: i,
      ioc: 0.038466,
      bigram: 0,
      rotorPositions: [0, 0, 0],
      ringSettings: [0, 0, 0],
      progress: 0,
    }))
  );
  const [plainText, setPlainText] = useState("");

  const iocOpacity = (ioc: number) => {
    let iocMin = 1;
    let iocMax = 0;
    rotorSettings.forEach((cur) => {
      iocMin = Math.min(iocMin, cur.ioc);
      iocMax = Math.max(iocMin, cur.ioc);
    });
    return (ioc - iocMin) / (iocMax - iocMin);
  };

  const rotorEnigmaWorkers = useMemo(() => {
    return rotorCombinations.map((rc, i) => {
      const enigmaWorker = new Worker(new URL("./enigma-worker.ts", import.meta.url), { type: "module" });
      // enigmaWorker.postMessage({ action: "init", payload: { enigmaId: i, rotors: rc, progress: 0 } });
      enigmaWorker.onmessage = ({ data }) => {
        const { action, payload } = data;
        switch (action) {
          case "reportIOC": {
            const { enigmaId, ioc, key } = payload;
            setRotorSettings((draft) => {
              const e = draft.find((e) => e.enigmaId === enigmaId);
              if (!e) throw Error();
              e.ioc = ioc;
              e.rotorPositions = key.rotorPositions;
              e.ringSettings = key.ringSettings;
            });
            // console.log("reportIOC", enigmaId, ioc, rotorPositions, progress);
            break;
          }
          case "reportBigram": {
            const { enigmaId, bigram, key } = payload;
            setRotorSettings((draft) => {
              const e = draft.find((e) => e.enigmaId === enigmaId);
              if (!e) throw Error();
              e.bigram = bigram;
              e.rotorPositions = key.rotorPositions;
              e.ringSettings = key.ringSettings;
            });
            // console.log("reportIOC", enigmaId, ioc, rotorPositions, progress);
            break;
          }
          case "reportProgress": {
            const { progress, enigmaId } = payload;
            setRotorSettings((draft) => {
              const e = draft.find((e) => e.enigmaId === enigmaId);
              if (!e) {
                throw Error();
              }
              e.progress = progress;
            });
            // console.log("reportIOC", enigmaId, ioc, rotorPositions, progress);
            break;
          }
        }
      };
      return enigmaWorker;
    });
  }, []);

  const findRotorSettings = useCallback(() => {
    rotorEnigmaWorkers.forEach((enigmaWorker, i) =>
      enigmaWorker.postMessage({ action: "testRotorPositions", payload: { enigmaId: i, cipherText: ciphertext, rotors: rotorCombinations[i] } })
    );
  }, [rotorEnigmaWorkers]);

  const rotorDivs = useMemo(() => {
    return rotorSettings.map((e, i) => {
      return (
        <VStack key={i} spacing="0px">
          <Box w="100%">
            <Progress colorScheme="green" size="sm" value={e.progress} />
          </Box>

          <HStack bg="lightcoral" spacing="0px">
            <VStack className="rotor" spacing="0px">
              <p className="rotorName">{rotorCombinations[e.enigmaId][0]}</p>
              <p className="rotorIndicator">{(e.rotorPositions[0] + e.ringSettings[0]) % 26}</p>
              <p className="rotorPosition">{e.rotorPositions[0]}</p>
              <p className="ringPosition">{e.ringSettings[0]}</p>
            </VStack>
            <VStack className="rotor" spacing="0px">
              <p className="rotorName">{rotorCombinations[e.enigmaId][1]}</p>
              <p className="rotorIndicator">{(e.rotorPositions[1] + e.ringSettings[1]) % 26}</p>
              <p className="rotorPosition">{e.rotorPositions[1]}</p>
              <p className="ringPosition">{e.ringSettings[1]}</p>
            </VStack>
            <VStack className="rotor" spacing="0px">
              <p className="rotorName">{rotorCombinations[e.enigmaId][2]}</p>
              <p className="rotorIndicator">{(e.rotorPositions[2] + e.ringSettings[2]) % 26}</p>
              <p className="rotorPosition">{e.rotorPositions[2]}</p>
              <p className="ringPosition">{e.ringSettings[2]}</p>
            </VStack>
          </HStack>
          <Box w="100%" textAlign="center" className="rainbow" style={{ background: `hsl(${(1 - scaleIOC(e.ioc)) * 244}, 100%, 50%)` }}>
            <p>{e.ioc.toFixed(4)}</p>
          </Box>
        </VStack>
      );
    });
  }, [rotorSettings]);

  return (
    <ChakraProvider>
      <Stack m="10px">
        <Button onClick={findRotorSettings} size="sm">
          Go
        </Button>
        <SimpleGrid columns={12} spacing="15px" m="10px">
          {rotorDivs}
        </SimpleGrid>
      </Stack>
    </ChakraProvider>
  );
}

export default App;
function useCallblack(arg0: () => void, arg1: never[]) {
  throw new Error("Function not implemented.");
}
