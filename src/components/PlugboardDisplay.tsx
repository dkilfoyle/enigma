import { Box, Flex, HStack, SimpleGrid, VStack } from "@chakra-ui/react";
import _ from "lodash";
import { memo, useMemo } from "react";

const qwerty = [
  "Q",
  "W",
  "E",
  "R",
  "T",
  "Y",
  "U",
  "I",
  "O",
  "P",
  "A",
  "S",
  "D",
  "F",
  "G",
  "H",
  "J",
  "K",
  "L",
  "Z",
  "X",
  "C",
  "V",
  "B",
  "N",
  "M",
];
const palette = ["red-300", "orange-300", "yellow-300", "green-300", "teal-300", "blue-300", "cyan-300", "purple-300", "pink-300", "pink-800"];

interface IPlugboardProps {
  plugboard: string;
}

export const PlugboardDisplay = memo(function PlugboardDisplay({ plugboard }: IPlugboardProps) {
  const keyColors = useMemo(() => {
    const colors = _.fill(Array(26), "var(--chakra-colors-gray-300)");
    const sortedPairs = plugboard
      .split(" ")
      .map((pair) => {
        return pair[0] < pair[1] ? pair : pair[1] + pair[0];
      })
      .sort();
    sortedPairs.forEach((pair, i) => {
      colors[qwerty.indexOf(pair[0])] = `var(--chakra-colors-${palette[i]})`;
      colors[qwerty.indexOf(pair[1])] = `var(--chakra-colors-${palette[i]})`;
    });

    return colors;
  }, [plugboard]);

  return (
    <Box className="plugboard" border="1px solid black" p={5}>
      <VStack gap={5}>
        <HStack>
          {_.range(0, 10).map((i) => (
            <Box w="100px" bg={keyColors[i]} textAlign="center" key={i}>
              {qwerty[i]}
            </Box>
          ))}
        </HStack>
        <HStack>
          {_.range(10, 19).map((i) => (
            <Box w="100px" bg={keyColors[i]} textAlign="center" key={i}>
              {qwerty[i]}
            </Box>
          ))}
        </HStack>
        <HStack>
          {_.range(19, 27).map((i) => (
            <Box w="100px" bg={keyColors[i]} textAlign="center" key={i}>
              {qwerty[i]}
            </Box>
          ))}
        </HStack>
      </VStack>
    </Box>
  );
});
