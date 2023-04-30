import { useMemo, useState } from "react";
import "./App.css";
import Odometer from "react-odometerjs";

import "odometer/themes/odometer-theme-default.css";
import { ChakraProvider, Grid, GridItem } from "@chakra-ui/react";
import _ from "lodash";
import { Rotor } from "./encode/rotor";

function App() {
  const [count, setCount] = useState<number[]>(_.range(60));

  const rotorCombinations = useMemo(() => {
    const availRotors = ["I", "II", "III", "IV", "V"];
    const r: Rotor[][] = [];
    for (const r1 of availRotors) {
      for (const r2 of availRotors) {
        if (r1 == r2) continue;
        for (const r3 of availRotors) {
          if (r1 == r3 || r2 == r3) continue;
          r.push([new Rotor(r1, 0, 0), new Rotor(r2, 0, 0), new Rotor(r3, 0, 0)]);
        }
      }
    }
    return r;
  }, []);

  const rotorDivs = useMemo(() => {
    return rotorCombinations.map((r123, i) => {
      return (
        <GridItem key={i}>
          <h2>
            {r123[0].name} {r123[1].name} {r123[2].name}
          </h2>
          <Odometer value={r123[0].rotorPosition * 100 + r123[1].rotorPosition * 10 + r123[2].rotorPosition} format={"ddd"}></Odometer>
        </GridItem>
      );
    });
  }, [rotorCombinations]);

  return (
    <ChakraProvider>
      <Grid templateRows="repeat(12,1fr)" templateColumns="repeat(5,1fr)" gap={2}>
        {rotorDivs}
      </Grid>
    </ChakraProvider>
  );
}

export default App;
