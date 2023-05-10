import { VStack } from "@chakra-ui/react";
import { memo } from "react";
import CountUp from "react-countup";

export interface IRotorProps {
  name: string;
  position: number;
  ring: number;
}

export const RotorDisplay = memo(function RotorDisplay({ name, position, ring }: IRotorProps) {
  return (
    <VStack className="rotor" spacing="0px">
      <p className="rotorName">{name}</p>
      <CountUp className="rotorIndicator" end={position}></CountUp>
      <p className="ringPosition">{ring}</p>
    </VStack>
  );
});
