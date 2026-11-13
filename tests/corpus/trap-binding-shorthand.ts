// A binding whose initializer calls a function that is declared but never
// defined (a host binding missing in this environment) never holds a value:
// the call throws Node's ReferenceError first. Shorthand properties that
// name such a binding compile like the long form, and never run.
declare function hostExport(instance: bigint, index: number): bigint;

class Memory {
  readonly handle: bigint;
  readonly instance: bigint;
  constructor(initial: number, adopt?: { handle: bigint; instance: bigint; shared: boolean }) {
    this.handle = adopt ? adopt.handle : BigInt(initial);
    this.instance = adopt ? adopt.instance : 0n;
  }
}

const exportsOf = (instance: bigint, count: number): Memory[] => {
  const values: Memory[] = [];
  for (let index = 0; index < count; index++) {
    const handle = hostExport(instance, index);
    if (handle === 0n) continue;
    values.push(new Memory(0, { handle, instance, shared: false }));
  }
  return values;
};

console.log(exportsOf(7n, 0).length);
try {
  exportsOf(7n, 2);
  console.log("unreachable");
} catch (error) {
  console.log(error instanceof ReferenceError, (error as Error).message);
}
console.log(new Memory(3).handle);
