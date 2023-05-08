import _ from "lodash";
import { Enigma, IEnigmaKey } from "../encode/enigma";
import { getIOC } from "./Fitness";

const maxGenerations = 100;
const numIndividuals = 12;
const numGenes = 5;

const randomUnused = (max: number, used: number[]) => {
  for (;;) {
    const x = _.random(max);
    if (!used.includes(x)) return x;
  }
};

const solvePlugboard = (rotors: string[], rotorPositions: number[], ringSettings: number[], ciphertext: string) => {
  console.log("Solve Plugboard", rotors, rotorPositions, ringSettings);

  // generate 100 individuals each with 10 genes, each gene is a stecker
  let population: number[][][] = [];
  for (let i = 0; i < numIndividuals; i++) {
    const used: number[] = [];
    const genes: number[][] = [];
    for (let g = 0; g < numGenes; g++) {
      const x = randomUnused(25, used);
      used.push(x);
      const y = randomUnused(25, used);
      used.push(y);
      genes.push([x, y]);
    }
    // check no duplicates
    if (genes.flat().length != _.uniq(genes.flat()).length) throw Error();
    population.push(genes);
  }

  for (let generation = 0; generation < maxGenerations; generation++) {
    // calculate and sort population fitness
    const fitness = population
      .map((genes, individualID) => {
        const plugboard = genes.reduce((accum, gene, i) => {
          accum += String.fromCharCode(gene[0] + 65) + String.fromCharCode(gene[1] + 65) + (i < 9 ? " " : "");
          return accum;
        }, "");
        const e = new Enigma(rotors, "B", rotorPositions, ringSettings, plugboard);
        const decryption = e.encryptString(ciphertext);
        const ioc = getIOC(decryption);
        return { ioc, individualID, plugboard };
      })
      .sort((a, b) => b.ioc - a.ioc);

    const elite = fitness.slice(0, numIndividuals / 3);
    const middle = fitness.slice(numIndividuals / 3, (numIndividuals / 3) * 2);
    const losers = fitness.slice((numIndividuals / 3) * 2, numIndividuals);

    // console.log(`Generation ${generation} best ioc = ${elite[0].ioc} with plugboard ${elite[0].plugboard}`);
    self.postMessage({
      action: "reportPlugboard",
      payload: {
        ioc: elite[0].ioc,
        plugboard: elite[0].plugboard,
      },
    });

    // breed elite and middle, best to best
    const children: number[][][] = [];
    for (let pair = 0; pair < numIndividuals / 3; pair++) {
      // randomise p1,p2 from elite,middle
      const coin = _.random(0, 1);
      let p1, p2;
      if (_.random(0, 1)) {
        p1 = elite[pair];
        p2 = middle[pair];
      } else {
        p1 = middle[pair];
        p2 = elite[pair];
      }

      // console.log("parent1", p1.individualID, p1.ioc, population[p1.individualID]);
      // console.log("parent2", p2.individualID, p2.ioc, population[p2.individualID]);

      const child: number[][] = [];

      // randomly select 50% genes from p1
      const used1: number[] = [];
      for (let p1gene = 0; p1gene < Math.ceil(numGenes / 2); p1gene++) {
        const randomGene = randomUnused(numGenes - 1, used1);
        used1.push(randomGene);
        child.push([...population[p1.individualID][randomGene]]);
      }

      // randomly select 50% genes from p2, but if gene not unique then select a random vacant base
      const used2: number[] = [];
      for (let p2gene = 0; p2gene < Math.floor(numGenes / 2); p2gene++) {
        const randomGene = randomUnused(numGenes - 1, used2);
        used2.push(randomGene);

        const newGene = [...population[p2.individualID][randomGene]];
        // if newGene[0] already exists in child replace with random unsued letter
        const usedLettersInChild = child.flat();
        usedLettersInChild.push(newGene[1]);
        if (child.find((gene) => gene[0] == newGene[0] || gene[1] == newGene[0])) {
          const newLetter = randomUnused(25, usedLettersInChild);
          newGene[0] = newLetter;
          usedLettersInChild.push(newLetter);
        }
        // if newGene[1] already exists in child replace with random unsued letter
        if (child.find((gene) => gene[0] == newGene[1] || gene[1] == newGene[1])) {
          const newLetter = randomUnused(25, usedLettersInChild);
          newGene[1] = newLetter;
        }
        child.push(newGene);
      }

      // todo: add mutations to child

      // check no duplicates
      if (child.flat().length != _.uniq(child.flat()).length) {
        console.log("parent1", p1.individualID, p1.ioc, population[p1.individualID]);
        console.log("parent2", p2.individualID, p2.ioc, population[p2.individualID]);
        console.log("child", child);
        throw Error();
      }
      children.push(child);
    }

    population = [...elite.map((x) => [...population[x.individualID]]), ...middle.map((x) => [...population[x.individualID]]), ...children];
  }
};

onmessage = async ({ data }) => {
  const { action, payload } = data;
  switch (action) {
    case "testPlugboard": {
      solvePlugboard(payload.rotors, payload.rotorPositions, payload.ringSettings, payload.ciphertext);
      self.postMessage({
        action: "donePlugboard",
        payload: {
          enigmaId: payload.enigmaId,
        },
      });
      break;
    }
  }
};
