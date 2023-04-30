// adapted from https://github.com/mikepound/enigma

export class Rotor {
  public forwardWiring: number[] = [];
  public backwardWiring: number[] = [];
  public notchPosition: number;

  constructor(public name: string, public rotorPosition: number, public ringSetting: number) {
    switch (name) {
      case "I":
        this.createWiring("EKMFLGDQVZNTOWYHXUSPAIBRCJ");
        // this.createWiring("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
        this.notchPosition = 16;
        break;
      case "II":
        this.createWiring("AJDKSIRUXBLHWTMCQGZNPYFVOE");
        this.notchPosition = 4;
        break;
      case "III":
        this.createWiring("BDFHJLCPRTXVZNYEIWGAKMUSQO");
        this.notchPosition = 21;
        break;
      case "IV":
        this.createWiring("ESOVPZJAYQUIRHXLNFTGKDCMWB");
        this.notchPosition = 9;
        break;
      case "V":
        this.createWiring("VZBRGITYUPSDNHLXAWMJQOFECK");
        this.notchPosition = 25;
        break;
      default:
        throw Error(`unknown rotor name ${name}`);
    }
  }

  createWiring(encoding: string) {
    this.forwardWiring = encoding.split("").map((c) => c.charCodeAt(0) - 65);
    this.forwardWiring.forEach((f, i) => {
      this.backwardWiring[f] = i;
    });
  }

  getMapping() {
    return "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((c) => String.fromCharCode(this.forward(c.charCodeAt(0) - 65) + 65));
  }

  encipher(k: number, pos: number, ring: number, mapping: number[]) {
    const shift = pos - ring;
    console.log(
      `Enciper ${k} @ ${this.name}/${pos} : shift = ${shift}, offset = ${(k + shift + 26) % 26}, mapping = ${
        mapping[(k + shift + 26) % 26]
      }, final = ${(mapping[(k + shift + 26) % 26] - shift + 26) % 26} `
    );
    return (mapping[(k + shift + 26) % 26] - shift + 26) % 26;
  }

  forward(c: number) {
    return this.encipher(c, this.rotorPosition, this.ringSetting, this.forwardWiring);
  }

  backward(c: number) {
    return this.encipher(c, this.rotorPosition, this.ringSetting, this.backwardWiring);
  }

  isAtNotch() {
    return this.notchPosition == this.rotorPosition;
  }

  turnover() {
    this.rotorPosition = (this.rotorPosition + 1) % 26;
  }
}
