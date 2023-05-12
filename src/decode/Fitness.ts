import _ from "lodash";
import { bigrams } from "./bigrams";
import quadgramsTxt from "./quadgrams?raw";

export interface IFitness {
  score: (text: string) => number;
}

class QuadgramFitness implements IFitness {
  public quadgrams: number[];
  constructor() {
    this.quadgrams = _.fill(Array(845626), -9.522878745280337);
    quadgramsTxt.split("\n").forEach((line) => {
      const [q, score] = line.split(",");
      this.quadgrams[this.quadIndex(q)] = parseFloat(score);
    });
  }
  quadIndex(abcd: string) {
    const [a, b, c, d] = abcd.split("").map((x) => x.charCodeAt(0) - 65);
    return (a << 15) | (b << 10) | (c << 5) | d;
  }
  score(text: string) {
    let fitness = 0;
    for (let i = 0; i < text.length; i++) {
      const abcd = text.slice(i, i + 5);
      fitness += this.quadgrams[this.quadIndex(abcd)];
    }
    return fitness;
  }
}

class IOCFitness implements IFitness {
  score(txt: string) {
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
  }
}

class BigramsFitness implements IFitness {
  score(txt: string) {
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
  }
}

export const iocFitness = new IOCFitness();
export const bigramsFitness = new BigramsFitness();
export const quadgramFitness = new QuadgramFitness();

export const getFitness = (fitness: string) => {
  switch (fitness) {
    case "ioc":
      return iocFitness;
    case "bigrams":
      return bigramsFitness;
    case "quadgrams":
      return quadgramFitness;
    default:
      throw Error(`Unknown fitness scorer ${fitness}`);
  }
};
