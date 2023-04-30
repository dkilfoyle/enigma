import { Plugboard } from "./plugboard";
import { Reflector } from "./reflector";
import { Rotor } from "./rotor";

export class Enigma {
  public leftRotor: Rotor;
  public middleRotor: Rotor;
  public rightRotor: Rotor;
  public reflector: Reflector;
  public plugboard: Plugboard;

  constructor(rotors: string[], reflector: string, rotorPositions: number[], ringSettings: number[], plugboardConnections: string) {
    this.leftRotor = new Rotor(rotors[0], rotorPositions[0], ringSettings[0]);
    this.middleRotor = new Rotor(rotors[1], rotorPositions[1], ringSettings[1]);
    this.rightRotor = new Rotor(rotors[2], rotorPositions[2], ringSettings[2]);
    this.reflector = new Reflector(reflector);
    this.plugboard = new Plugboard(plugboardConnections);
  }

  rotate() {
    if (this.middleRotor.isAtNotch()) {
      this.middleRotor.turnover();
      this.leftRotor.turnover();
    } else if (this.rightRotor.isAtNotch()) {
      this.middleRotor.turnover();
    }
    this.rightRotor.turnover();
  }

  encrypt(c: number) {
    this.rotate();

    const c0 = this.plugboard.forward(c);

    const c1 = this.rightRotor.forward(c0);
    const c2 = this.middleRotor.forward(c1);
    const c3 = this.leftRotor.forward(c2);

    const c4 = this.reflector.forward(c3);

    const c5 = this.leftRotor.backward(c4);
    const c6 = this.middleRotor.backward(c5);
    const c7 = this.rightRotor.backward(c6);

    const c8 = this.plugboard.forward(c7);
    return c8;
  }

  encryptChar(c: string) {
    return String.fromCharCode(this.encrypt(c.charCodeAt(0) - 65) + 65);
  }

  encryptString(c: string) {
    return c
      .split("")
      .map((cc) => this.encryptChar(cc))
      .join("");
  }
}
