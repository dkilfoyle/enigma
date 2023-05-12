import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import Odometer from "react-odometerjs";

import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  ChakraProvider,
  Grid,
  GridItem,
  HStack,
  Heading,
  Progress,
  SimpleGrid,
  Stack,
  Table,
  Tbody,
  Td,
  Textarea,
  Th,
  Thead,
  Tr,
  VStack,
} from "@chakra-ui/react";
import _ from "lodash";
import { useImmer } from "use-immer";
import { useCountUp } from "react-countup";

import { WorkerPool } from "./utils/WorkerPool.ts";
import { RotorDisplay } from "./components/RotorDisplay.tsx";
import { PlugboardDisplay } from "./components/PlugboardDisplay.tsx";
import { Enigma, IEnigmaKey } from "./encode/enigma.ts";
import { wordSplitter } from "./decode/WordSplitter.ts";
const workerPool = new WorkerPool(5);

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

interface IEnigma {
  id: number;
  ioc: number;
  bigram: number;
  progress: number;
  key: IEnigmaKey;
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
  const [enigmas, setEnigmas] = useImmer<IEnigma[]>(
    rotorCombinations.map((rc, i) => ({
      id: i,
      ioc: 0.038466,
      bigram: 0,
      key: {
        rotors: rc,
        rotorIndicators: [0, 0, 0],
        ringSettings: [0, 0, 0],
        plugboard: "",
      },
      progress: 0,
    }))
  );

  const [plainText, setPlainText] = useState("");
  const [rotorFitness, setRotorFitness] = useState("ioc");
  const [ringFitness, setRingFitness] = useState("bigrams");
  const [plugboardFitness, setPlugboardFitness] = useState("quadgrams");

  const bestEnigmas = useMemo(() => {
    return [...enigmas].sort((a, b) => b.ioc - a.ioc);
  }, [enigmas]);

  const workerHandler = useCallback(
    (data: any) => {
      const { action, payload } = data;
      switch (action) {
        case "reportRotorSettings": {
          const { id, ioc, key } = payload;
          setEnigmas((draft) => {
            const e = draft.find((e) => e.id === id);
            if (!e) throw Error();
            e.ioc = ioc;
            e.key.rotorIndicators = key.rotorIndicators;
            e.key.ringSettings = key.ringSettings;
          });
          if (payload.finished) return true;
          break;
        }
        case "reportRotorProgress": {
          const { progress, id } = payload;
          setEnigmas((draft) => {
            const e = draft.find((e) => e.id === id);
            if (!e) throw Error();
            e.progress = progress;
          });
          break;
        }
        case "reportPlugboardSettings": {
          const { id, ioc, plugboard } = payload;
          setEnigmas((draft) => {
            const e = draft.find((e) => e.id === id);
            if (!e) throw Error();
            if (ioc > e.ioc) {
              e.ioc = ioc;
              e.key.plugboard = plugboard;
            }
          });
          if (payload.finished) return true;
          break;
        }
      }
      return false;
    },
    [setEnigmas]
  );

  const findRotorSettings = useCallback(() => {
    const byReverseColumn = [
      11, 23, 35, 47, 59, 10, 22, 34, 46, 58, 9, 21, 33, 45, 57, 8, 20, 32, 44, 56, 7, 19, 31, 43, 55, 6, 18, 30, 42, 54, 5, 17, 29, 41, 53, 4,
      16, 28, 40, 52, 3, 15, 27, 39, 51, 2, 14, 26, 38, 50, 1, 13, 25, 37, 49, 0, 12, 24, 36, 48,
    ];

    byReverseColumn.forEach((i) => {
      const rc = enigmas[i];
      workerPool.queueJob(
        "./src/decode/enigma-worker.ts",
        {
          action: "testRotorPositions",
          payload: { id: i, rotors: rc.key.rotors, plugboard: rc.key.plugboard, ciphertext, rotorFitness, ringFitness, rotorsAndRings: false },
        },
        workerHandler,
        self
      );
    });
  }, [enigmas, rotorFitness, ringFitness, workerHandler]);

  const findRotorAndRingSettings = useCallback(() => {
    bestEnigmas.slice(0, 1).forEach((be) => {
      workerPool.queueJob(
        "./src/decode/enigma-worker.ts",
        {
          action: "testRotorPositions",
          payload: {
            id: be.id,
            rotors: be.key.rotors,
            plugboard: be.key.plugboard,
            ciphertext,
            rotorFitness: "quadgrams",
            ringFitness,
            rotorsAndRings: true,
          },
        },
        workerHandler,
        self
      );
    });
  }, [bestEnigmas, ringFitness, workerHandler]);

  const findPlugboardSettings = useCallback(() => {
    bestEnigmas.slice(0, 10).forEach((e) => {
      workerPool.queueJob(
        "./src/decode/plugboard-worker.ts",
        {
          action: "testPlugboard",
          payload: {
            ciphertext,
            id: e.id,
            rotors: e.key.rotors,
            rotorIndicators: e.key.rotorIndicators,
            ringSettings: e.key.ringSettings,
            fitness: plugboardFitness,
          },
        },
        workerHandler,
        self
      );
    });
  }, [workerHandler, bestEnigmas, plugboardFitness]);

  const rotorDivs = useMemo(() => {
    return enigmas.map((e, i) => {
      return (
        <VStack key={i} spacing="0px">
          <Box w="100%">
            <Progress colorScheme="gray" size="xs" value={e.progress} />
          </Box>
          <HStack style={{ background: `hsl(${(1 - scaleIOC(e.ioc)) * 204}, 100%, 70%)` }} spacing="0px">
            <RotorDisplay name={rotorCombinations[e.id][0]} position={e.key.rotorIndicators[0]} ring={e.key.ringSettings[0]}></RotorDisplay>
            <RotorDisplay name={rotorCombinations[e.id][1]} position={e.key.rotorIndicators[1]} ring={e.key.ringSettings[1]}></RotorDisplay>
            <RotorDisplay name={rotorCombinations[e.id][2]} position={e.key.rotorIndicators[2]} ring={e.key.ringSettings[2]}></RotorDisplay>
          </HStack>
          <Box w="100%" textAlign="center" className="rainbow" style={{ background: `hsl(${(1 - scaleIOC(e.ioc)) * 204}, 100%, 65%)` }}>
            <p>{e.ioc.toFixed(4)}</p>
          </Box>
        </VStack>
      );
    });
  }, [enigmas]);

  const currentDecryption = useMemo(() => {
    const e = Enigma.createFromKey(bestEnigmas[0].key);
    return e.encryptString(ciphertext);
  }, [bestEnigmas]);

  return (
    <ChakraProvider>
      <Stack m="10px">
        <HStack>
          <Button onClick={findRotorSettings} size="sm">
            Solve Rotors
          </Button>
          <Button onClick={findPlugboardSettings} size="sm">
            Solve Plugboard
          </Button>
          <Button onClick={findRotorAndRingSettings} size="sm">
            Solve Rotors & Rings
          </Button>
        </HStack>
        <Card size="sm">
          <CardBody>
            <SimpleGrid columns={12} spacing="15px" m="10px">
              {rotorDivs}
            </SimpleGrid>
          </CardBody>
        </Card>
        <Card size="sm">
          <CardBody>
            <PlugboardDisplay plugboard={bestEnigmas[0].key.plugboard || ""}></PlugboardDisplay>
          </CardBody>
        </Card>

        <Card size="sm">
          <CardHeader>
            <Heading size="sm">Best Decryption</Heading>
          </CardHeader>
          <CardBody>
            <Textarea value={wordSplitter.split(currentDecryption).join(" ")} readOnly></Textarea>
          </CardBody>
        </Card>
        <Card size="sm">
          <CardHeader>
            <Heading size="sm">Best Settings</Heading>
          </CardHeader>
          <CardBody>
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>ID</Th>
                  <Th>IOC</Th>
                  <Th>Rotors</Th>
                  <Th>Indicators</Th>
                  <Th>Rings</Th>
                  <Th>Plugboard</Th>
                </Tr>
              </Thead>
              <Tbody>
                <Tr>
                  <Td>{bestEnigmas[0].id}</Td>
                  <Td>{bestEnigmas[0].ioc.toFixed(4)}</Td>
                  <Td>{bestEnigmas[0].key.rotors.join(", ")}</Td>
                  <Td>{bestEnigmas[0].key.rotorIndicators.join(", ")}</Td>
                  <Td>{bestEnigmas[0].key.ringSettings.join(", ")}</Td>
                  <Td>
                    {bestEnigmas[0].key.plugboard == ""
                      ? ""
                      : bestEnigmas[0].key.plugboard
                          .split(" ")
                          .map((pair) => {
                            return pair[0] < pair[1] ? pair : pair[1] + pair[0];
                          })
                          .sort()
                          .join(" ")}
                  </Td>
                </Tr>
              </Tbody>
            </Table>
          </CardBody>
        </Card>
      </Stack>
    </ChakraProvider>
  );
}

export default App;
