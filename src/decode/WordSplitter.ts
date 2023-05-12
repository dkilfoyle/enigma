import wordsTxt from "./words.txt?raw";

class WordSplitter {
  public wordCost: Record<string, number> = {};
  public maxWordLen = 0;
  constructor() {
    const words = wordsTxt.split("\n");
    words.forEach((word, index) => {
      this.wordCost[word] = Math.log((index + 1) * Math.log(words.length));
    });
    this.maxWordLen = words.reduce((accum, cur) => Math.max(accum, cur.length), 0);
  }
  split(s: string) {
    const cost = [0];

    const best_match = (i: number) => {
      const candidates = cost.slice(Math.max(0, i - this.maxWordLen), i).reverse();
      let minPair = [Number.MAX_SAFE_INTEGER, 0];
      candidates.forEach((c, k) => {
        let ccost = 0;
        if (this.wordCost[s.substring(i - k - 1, i).toLowerCase()]) {
          ccost = c + this.wordCost[s.substring(i - k - 1, i).toLowerCase()];
        } else {
          ccost = Number.MAX_SAFE_INTEGER;
        }
        if (ccost < minPair[0]) {
          minPair = [ccost, k + 1];
        }
      });
      return minPair;
    };

    for (let i = 1; i < s.length + 1; i++) {
      cost.push(best_match(i)[0]);
    }

    const out: string[] = [];
    let i = s.length;
    while (i > 0) {
      const c = best_match(i)[0];
      const k = best_match(i)[1];
      // if (c == cost[i]) console.log("Alert: " + c);

      let newToken = true;
      if (s.slice(i - k, i) != "'") {
        if (out.length > 0) {
          if (out[-1] == "'s" || (Number.isInteger(s[i - 1]) && Number.isInteger(out[-1][0]))) {
            out[-1] = s.slice(i - k, i) + out[-1];
            newToken = false;
          }
        }
      }

      if (newToken) {
        out.push(s.slice(i - k, i));
      }

      i -= k;
    }
    return out.reverse();
  }
}

export const wordSplitter = new WordSplitter();
