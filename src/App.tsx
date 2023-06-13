import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  ChakraProvider,
  Flex,
  Grid,
  GridItem,
  HStack,
  Heading,
  Progress,
  SimpleGrid,
  Spinner,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Text,
  Table,
  Tabs,
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
import { Console, Hook, Unhook } from "console-feed";

import { WorkerPool } from "./utils/WorkerPool.ts";
import { RotorDisplay } from "./components/RotorDisplay.tsx";
import { PlugboardDisplay } from "./components/PlugboardDisplay.tsx";
import { Enigma, IEnigmaKey } from "./encode/enigma.ts";
import { wordSplitter } from "./decode/WordSplitter.ts";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { ArrowForwardIcon } from "@chakra-ui/icons";
import { TbCircleNumber1, TbCircleNumber2, TbCircleNumber3 } from "react-icons/tb";
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
  const iocEnglish = 0.066332;
  return (ioc - iocRandom) / (iocEnglish - iocRandom);
};

let bestIOC = 0;

function App() {
  const [logs, setLogs] = useState<any[]>([]);
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
  const [isRotorRingSolving, setRotorRingSolving] = useState(false);
  const [isRotorSolving, setRotorSolving] = useState(false);
  const [isPlugboardSolving, setPlugboardSolving] = useState(false);

  const bestEnigmas = useMemo(() => {
    return [...enigmas].sort((a, b) => b.ioc - a.ioc);
  }, [enigmas]);

  const bestEnigmasRef = useRef<IEnigma[]>();
  bestEnigmasRef.current = bestEnigmas;

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
          if (ioc > bestIOC) {
            bestIOC = parseFloat(Number(ioc).toFixed(4));
            console.log(` - New best rotor: #${id}, ioc=${bestIOC}`);
          }
          if (payload.finished) {
            return true;
          }
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
          const { id, ioc, plugboard, generation } = payload;
          setEnigmas((draft) => {
            const e = draft.find((e) => e.id === id);
            if (!e) throw Error();
            if (ioc > e.ioc) {
              e.ioc = ioc;
              e.key.plugboard = plugboard;
            }
            if (ioc > bestIOC) {
              bestIOC = parseFloat(Number(ioc).toFixed(4));
              console.log(` - New best plugboard: #${id}, ioc = ${bestIOC} @ generation ${generation}`);
            }
            e.progress = generation;
          });
          if (payload.finished) return true;
          break;
        }
      }
      return false;
    },
    [setEnigmas]
  );

  const doneRotors = () => {
    if (bestEnigmasRef.current) {
      const bestEnigma = bestEnigmasRef.current[0];
      console.log(
        ` - Best rotor: #${bestEnigma.id} ${bestEnigma.key.rotors.join(", ")} ${bestEnigma.key.rotorIndicators.join(
          ", "
        )} ${bestEnigma.key.ringSettings.join(", ")}`
      );
    }
    setRotorSolving(false);
    setRotorRingSolving(false);
  };

  const donePlugboard = () => {
    if (bestEnigmasRef.current) {
      const bestEnigma = bestEnigmasRef.current[0];
      console.log(` - Best Plugboard: #${bestEnigma.id} = ${bestEnigma.key.plugboard}`);
    }
    setPlugboardSolving(false);
  };

  const findRotorSettings = useCallback(() => {
    setRotorSolving(true);
    bestIOC = 0;
    const byReverseColumn = [
      11, 23, 35, 47, 59, 10, 22, 34, 46, 58, 9, 21, 33, 45, 57, 8, 20, 32, 44, 56, 7, 19, 31, 43, 55, 6, 18, 30, 42, 54, 5, 17, 29, 41, 53, 4,
      16, 28, 40, 52, 3, 15, 27, 39, 51, 2, 14, 26, 38, 50, 1, 13, 25, 37, 49, 0, 12, 24, 36, 48,
    ];
    console.log("Solving rotor THEN ring settings...");

    const jobs = byReverseColumn.map((i) => {
      const rc = enigmas[i];

      return {
        url: "./src/decode/enigma-worker.ts",
        msg: {
          action: "testRotorPositions",
          payload: { id: i, rotors: rc.key.rotors, plugboard: rc.key.plugboard, ciphertext, rotorFitness, ringFitness, rotorsAndRings: false },
        },
        handler: workerHandler,
        ctx: self,
      };
    });

    workerPool.queueJobs(jobs, doneRotors);
  }, [enigmas, rotorFitness, ringFitness, workerHandler]);

  const findRotorAndRingSettings = useCallback(() => {
    setRotorRingSolving(true);
    console.log("Solving rotor AND ring settings...");
    console.log(` - Processing best Enigma #${bestEnigmas[0].id}`);
    const jobs = bestEnigmas.slice(0, 1).map((be) => {
      setEnigmas((draft) => {
        const e = draft.find((e) => e.id === be.id);
        if (!e) throw Error();
        e.progress = 0;
      });
      return {
        url: "./src/decode/enigma-worker.ts",
        msg: {
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
        handler: workerHandler,
        ctx: self,
      };
    });
    workerPool.queueJobs(jobs, doneRotors);
  }, [bestEnigmas, ringFitness, setEnigmas, workerHandler]);

  const findPlugboardSettings = useCallback(() => {
    setPlugboardSolving(true);
    console.log("Solving plugboard settings...");
    const jobs = bestEnigmas.slice(0, 10).map((be) => {
      setEnigmas((draft) => {
        const e = draft.find((e) => e.id === be.id);
        if (!e) throw Error();
        e.progress = 0;
      });
      return {
        url: "./src/decode/plugboard-worker.ts",
        msg: {
          action: "testPlugboard",
          payload: {
            ciphertext,
            id: be.id,
            rotors: be.key.rotors,
            rotorIndicators: be.key.rotorIndicators,
            ringSettings: be.key.ringSettings,
            fitness: plugboardFitness,
          },
        },
        handler: workerHandler,
        ctx: self,
      };
    });
    workerPool.queueJobs(jobs, donePlugboard);
  }, [bestEnigmas, setEnigmas, plugboardFitness, workerHandler]);

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

  useEffect(() => {
    const hookedConsole = Hook(window.console, (log) => setLogs((currLogs) => [...currLogs, log]), false);
    // _.range(0, 50).forEach((x) => console.log(x));
    return () => {
      Unhook(hookedConsole);
    };
  }, []);

  return (
    <ChakraProvider>
      <Grid p={2} height="100%">
        <Tabs defaultIndex={1} height="100%" overflow="hidden" display="grid" gridTemplateRows={"auto 1fr"}>
          <TabList>
            <Tab>Encode</Tab>
            <Tab>Decode</Tab>
          </TabList>
          <TabPanels display="grid">
            <TabPanel></TabPanel>
            <TabPanel h="100%" overflow="hidden">
              <Grid templateColumns={"1fr auto"} gap={5} height="100%" overflow="hidden">
                <Grid templateRows={"repeat(3, auto) 1fr"} rowGap={5}>
                  <Card size="sm" variant="outline">
                    <CardBody>
                      <Grid templateColumns="100px 1fr" gap={2}>
                        <Text as="b">Solve</Text>
                        <HStack>
                          <Button onClick={findRotorSettings} colorScheme={isRotorSolving ? "green" : "gray"} size="sm">
                            <Flex gap={2}>
                              {isRotorSolving ? <Spinner size="sm" /> : <TbCircleNumber1 size="20px" />}
                              <span>Solve Rotors + Rings</span>
                            </Flex>
                          </Button>
                          <Button onClick={findPlugboardSettings} colorScheme={isPlugboardSolving ? "green" : "gray"} size="sm">
                            <Flex gap={2}>
                              {isPlugboardSolving ? <Spinner size="sm" /> : <TbCircleNumber2 size="20px" />}
                              <span>Solve Plugboard</span>
                            </Flex>
                          </Button>
                          <Button onClick={findRotorAndRingSettings} colorScheme={isRotorRingSolving ? "green" : "gray"} size="sm">
                            <Flex gap={2}>
                              {isRotorRingSolving ? <Spinner size="sm" /> : <TbCircleNumber3 size="20px" />}
                              <span>Solve Rotors * Rings</span>
                            </Flex>
                          </Button>
                        </HStack>
                        <Text as="b">Solution</Text>
                        <Grid templateColumns={"repeat(6, 1fr)"}>
                          <Text as="b" fontSize="sm">
                            ID
                          </Text>
                          <Text as="b" fontSize="sm">
                            IOC
                          </Text>
                          <Text as="b" fontSize="sm">
                            ROTORS
                          </Text>
                          <Text as="b" fontSize="sm">
                            INDICATORS
                          </Text>
                          <Text as="b" fontSize="sm">
                            RINGS
                          </Text>
                          <Text as="b" fontSize="sm">
                            PLUGBOARD
                          </Text>
                          <span>{bestEnigmas[0].id}</span>
                          <span
                            style={{
                              background: `linear-gradient(90deg, lightblue ${scaleIOC(bestEnigmas[0].ioc) * 100}%, transparent ${
                                scaleIOC(bestEnigmas[0].ioc) * 100
                              }%)`,
                            }}>
                            {bestEnigmas[0].ioc.toFixed(4)}
                          </span>
                          <span>{bestEnigmas[0].key.rotors.join(", ")}</span>
                          <span>{bestEnigmas[0].key.rotorIndicators.join(", ")}</span>
                          <span>{bestEnigmas[0].key.ringSettings.join(", ")}</span>
                          <span>
                            {bestEnigmas[0].key.plugboard == ""
                              ? ""
                              : bestEnigmas[0].key.plugboard
                                  .split(" ")
                                  .map((pair) => {
                                    return pair[0] < pair[1] ? pair : pair[1] + pair[0];
                                  })
                                  .sort()
                                  .join(" ")}
                          </span>
                        </Grid>
                      </Grid>
                    </CardBody>
                  </Card>

                  <Card size="sm" variant="outline">
                    <CardBody>
                      <SimpleGrid columns={12} spacing="15px" m="10px">
                        {rotorDivs}
                      </SimpleGrid>
                    </CardBody>
                  </Card>
                  <Card size="sm" variant="outline">
                    <CardBody>
                      <PlugboardDisplay plugboard={bestEnigmas[0].key.plugboard || ""}></PlugboardDisplay>
                    </CardBody>
                  </Card>

                  <Card size="sm" variant="outline">
                    <CardHeader>
                      <Heading size="sm">Best Decryption</Heading>
                    </CardHeader>
                    <CardBody>
                      <Textarea h="100%" value={wordSplitter.split(currentDecryption).join(" ")} readOnly></Textarea>
                    </CardBody>
                  </Card>
                </Grid>
                <Box h="100%" overflowY="auto" border="1px solid #e2e8f0" borderRadius="3px">
                  <Console logs={logs}></Console>
                </Box>

                {/* <Card size="sm" variant="outline" w={400} h="100%">
                  <CardHeader>
                    <Heading size="sm">Progress</Heading>
                  </CardHeader>
                  <CardBody h="100%"></CardBody>
                </Card> */}
              </Grid>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Grid>
    </ChakraProvider>
  );
}

export default App;
