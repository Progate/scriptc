// Atomics on BigInt64Array and BigUint64Array, shared and not: every
// operation's result (the previous element, or store's own argument),
// wraparound at 64 bits by the array's signedness, compareExchange that
// compares the low 64 bits of the expected value, index conversion, and the
// RangeError for an index outside the array. A BigInt64Array and an
// Int32Array over one SharedArrayBuffer see each other's atomic writes.
function run<T extends BigInt64Array | BigUint64Array>(name: string, a: T): void {
  const out: string[] = [];
  const push = (...values: bigint[]): void => {
    for (const value of values) out.push(String(value));
  };
  push(Atomics.store(a, 0, 5n));
  push(Atomics.add(a, 0, 3n), Atomics.load(a, 0));
  push(Atomics.sub(a, 0, 10n), Atomics.load(a, 0));
  push(Atomics.and(a, 0, 0xffn), Atomics.or(a, 0, 0x7000n), Atomics.xor(a, 0, 0xf0f0n));
  push(Atomics.exchange(a, 0, -300n), Atomics.load(a, 0));
  push(Atomics.compareExchange(a, 0, 1n, 7n), Atomics.load(a, 0));
  push(Atomics.compareExchange(a, 0, Atomics.load(a, 0), 9n), Atomics.load(a, 0));
  // Expected values compare at 64 bits.
  push(Atomics.compareExchange(a, 1, 2n ** 64n, 4n), Atomics.load(a, 1));
  push(Atomics.compareExchange(a, 1, 4n - 2n ** 64n, 8n), Atomics.load(a, 1));
  push(Atomics.store(a, 2, -1n), Atomics.load(a, 2), Atomics.add(a, 2, 1n), Atomics.load(a, 2));
  push(Atomics.store(a, 3, 2n ** 63n - 1n), Atomics.add(a, 3, 1n), Atomics.load(a, 3));
  push(Atomics.sub(a, 3, 2n ** 64n + 1n), Atomics.load(a, 3));
  push(Atomics.store(a, 3, 2n ** 70n + 6n), Atomics.load(a, 3));
  console.log(name, out.join(" "));
}

run("BigInt64Array", new BigInt64Array(4));
run("BigInt64Array/shared", new BigInt64Array(new SharedArrayBuffer(32)));
run("BigUint64Array", new BigUint64Array(4));
run("BigUint64Array/shared", new BigUint64Array(new SharedArrayBuffer(32)));
run("BigInt64Array/view", new BigInt64Array(new ArrayBuffer(48), 16, 4));

// Index conversion: fractions truncate and NaN is 0; out of range throws.
const big = new BigInt64Array(new SharedArrayBuffer(32));
Atomics.store(big, 1, 11n);
Atomics.store(big, 0, 22n);
console.log(Atomics.load(big, 1.7), Atomics.load(big, NaN), Atomics.add(big, 3.999, 1n), Atomics.load(big, 3), Atomics.load(big, -0.5));
for (const index of [-1, 4, 4.5, Infinity, -Infinity, 2 ** 53]) {
  try {
    console.log("no error", index, Atomics.add(big, index, 1n));
  } catch (error) {
    console.log(index, (error as Error).name, (error as Error).message);
  }
}
for (const index of [-1, 4]) {
  try {
    console.log("no error", Atomics.compareExchange(new BigUint64Array(4), index, 0n, 1n));
  } catch (error) {
    console.log(index, (error as Error).name, (error as Error).message);
  }
}

// Arguments evaluate in order, before the index is checked.
const order: string[] = [];
const note = <T>(label: string, value: T): T => {
  order.push(label);
  return value;
};
try {
  Atomics.compareExchange(note("array", big), note("index", 9), note("expected", 1n), note("replacement", 2n));
} catch (error) {
  order.push((error as Error).name);
}
console.log(order.join(" "));

// Overlapping views address the same bytes.
const buffer = new SharedArrayBuffer(16);
const words = new Int32Array(buffer);
const wide = new BigInt64Array(buffer);
const unsignedWide = new BigUint64Array(buffer, 8);
Atomics.store(words, 0, -1);
Atomics.store(words, 1, 0x7fffffff);
console.log(Atomics.load(wide, 0), Atomics.add(wide, 0, 1n), Atomics.load(words, 0), Atomics.load(words, 1));
Atomics.or(unsignedWide, 0, 2n ** 63n);
Atomics.add(words, 2, 5);
console.log(Atomics.load(unsignedWide, 0), Atomics.load(wide, 1), Atomics.load(words, 3));
console.log(Number(Atomics.load(wide, 1)), Atomics.load(unsignedWide, 0) > 2n ** 62n, wide[0], unsignedWide[0]);
