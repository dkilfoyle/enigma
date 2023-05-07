import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import Odometer from "react-odometerjs";

import { Box, Button, ChakraProvider, Grid, GridItem, HStack, Progress, SimpleGrid, Stack, VStack } from "@chakra-ui/react";
import _ from "lodash";
import { useImmer } from "use-immer";
import { useCountUp } from "react-countup";

import { WorkerPool } from "./WorkerPool.ts";
import { RotorDisplay } from "./RotorDisplay.tsx";
const workerPool = new WorkerPool(5);

interface IRotorWorkerMessage {
  action: string;
  payload: any;
}

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
const rotorCombinations = rotorCombinationsAll.slice(0);

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

  const workerHandler = (data: any) => {
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
      case "doneRotors": {
        const { enigmaId, bigram, ioc, key } = payload;
        setRotorSettings((draft) => {
          const e = draft.find((e) => e.enigmaId === enigmaId);
          if (!e) throw Error();
          e.bigram = bigram;
          e.rotorPositions = key.rotorPositions;
          e.ringSettings = key.ringSettings;
        });
        // console.log("reportIOC", enigmaId, ioc, rotorPositions, progress);
        return true;
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
    return false;
  };

  const findRotorSettings = () => {
    const byReverseColumn = [
      11, 23, 35, 47, 59, 10, 22, 34, 46, 58, 9, 21, 33, 45, 57, 8, 20, 32, 44, 56, 7, 19, 31, 43, 55, 6, 18, 30, 42, 54, 5, 17, 29, 41, 53, 4,
      16, 28, 40, 52, 3, 15, 27, 39, 51, 2, 14, 26, 38, 50, 1, 13, 25, 37, 49, 0, 12, 24, 36, 48,
    ];

    byReverseColumn.forEach((i) => {
      const rc = rotorCombinations[i];
      workerPool.queueJob(
        "./src/enigma-worker.ts",
        { action: "testRotorPositions", payload: { enigmaId: i, rotors: rc, ciphertext } },
        workerHandler,
        self
      );
    });
  };

  const rotorDivs = useMemo(() => {
    return rotorSettings.map((e, i) => {
      return (
        <VStack key={i} spacing="0px">
          <Box w="100%">
            <Progress colorScheme="green" size="sm" value={e.progress} />
          </Box>
          <HStack bg="lightcoral" spacing="0px">
            <RotorDisplay name={rotorCombinations[e.enigmaId][0]} position={e.rotorPositions[0]} ring={e.ringSettings[0]}></RotorDisplay>
            <RotorDisplay name={rotorCombinations[e.enigmaId][1]} position={e.rotorPositions[1]} ring={e.ringSettings[1]}></RotorDisplay>
            <RotorDisplay name={rotorCombinations[e.enigmaId][2]} position={e.rotorPositions[2]} ring={e.ringSettings[2]}></RotorDisplay>
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
