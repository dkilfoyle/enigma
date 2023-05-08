import _ from "lodash";
import { bigrams } from "./bigrams";

export const getIOC = (txt: string) => {
  const histogram = _.fill(Array(26), 0);
  txt.split("").forEach((c) => {
    histogram[c.charCodeAt(0) - 65]++;
  });
  const n = txt.length;
  let total = 0;
  for (const v of histogram) {
    total += v * (v - 1);
  }
  return total / (n * (n - 1));
};

export const getBigrams = (txt: string) => {
  let fitness = 0;
  const current = 0;
  let next = txt.charAt(0);
  for (let i = 1; i < txt.length; i++) {
    const current = next;
    next = txt.charAt(i);
    const bg = bigrams[current + next];
    fitness += bg || -9.522878745280337;
  }
  return fitness;
};
