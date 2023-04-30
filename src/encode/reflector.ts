export class Reflector {
  protected forwardWiring: number[] = [];
  constructor(public name: string) {
    switch (name) {
      case "B":
        this.createWiring("YRUHQSLDPXNGOKMIEBFZCWVJAT");
        break;
      case "C":
        this.createWiring("FVPJIAOYEDRZXWGCTKUQSBNMHL");
        break;
      default:
        this.createWiring("ZYXWVUTSRQPONMLKJIHGFEDCBA");
    }
  }
  createWiring(encoding: string) {
    this.forwardWiring = encoding.split("").map((c) => c.charCodeAt(0) - 65);
  }

  forward(c: number) {
    return this.forwardWiring[c];
  }
}
