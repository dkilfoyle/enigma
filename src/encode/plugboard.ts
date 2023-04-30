export class Plugboard {
  public wiring: number[] = [];
  constructor(connections = "") {
    for (let i = 0; i < 26; i++) this.wiring[i] = i;
    if (connections == "") return;

    connections.split(" ").forEach((connection) => {
      const c1 = connection.charCodeAt(0) - 65;
      const c2 = connection.charCodeAt(1) - 65;
      this.wiring[c1] = c2;
      this.wiring[c2] = c1;
    });
  }

  forward(c: number) {
    return this.wiring[c];
  }
}
