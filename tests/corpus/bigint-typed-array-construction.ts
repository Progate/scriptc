// BigInt64Array and BigUint64Array construction: from a length, over a whole
// ArrayBuffer or SharedArrayBuffer, and as a view at an offset with or
// without a length. A view shares the buffer's storage, so an Int32Array
// over the same SharedArrayBuffer sees every element write. Bad lengths,
// misaligned offsets and out-of-range views throw Node's RangeErrors, for
// the other typed-array kinds too. The arrays also travel as fields,
// parameters, return values, WeakMap values and nullable unions.
const describe = (name: string, a: BigInt64Array | BigUint64Array): void => {
  console.log(name, a.length, a.byteLength, a.byteOffset, a.BYTES_PER_ELEMENT);
};

console.log(BigInt64Array.BYTES_PER_ELEMENT, BigUint64Array.BYTES_PER_ELEMENT);
describe("length", new BigInt64Array(3));
describe("fraction", new BigUint64Array(2.9));
describe("zero", new BigInt64Array(0));

const shared = new SharedArrayBuffer(48);
const words = new Int32Array(shared);
const big = new BigInt64Array(shared);
const tail = new BigUint64Array(shared, 16);
const middle = new BigInt64Array(shared, 8, 2);
describe("shared", big);
describe("tail", tail);
describe("middle", middle);
console.log(big.buffer === shared, tail.buffer === shared, middle.buffer === big.buffer);

big[0] = 0x1122334455667788n;
big[1] = -2n;
console.log(words[0]!.toString(16), words[1]!.toString(16), words[2], words[3]);
words[4] = 7;
words[5] = 1;
console.log(big[2], tail[0], middle[1]);
middle[0] = 99n;
console.log(big[1], words[2], words[3]);
tail[3] = 2n ** 64n - 1n;
console.log(big[5], words[10], words[11]);

const plain = new ArrayBuffer(24);
const bytes = new Uint8Array(plain);
const second = new BigUint64Array(plain, 8);
second[1] = 0x0102030405060708n;
console.log(second.length, Array.from(bytes.subarray(16)).join(","));
console.log(new BigInt64Array(plain, 16, 1)[0], new BigInt64Array(plain, 24).length);

const attempts: [string, () => number][] = [
  ["negative length", () => new BigInt64Array(-1).length],
  ["misaligned offset", () => new BigInt64Array(plain, 4).length],
  ["misaligned with length", () => new BigUint64Array(shared, 12, 1).length],
  ["negative offset", () => new BigInt64Array(plain, -8).length],
  ["offset past the end", () => new BigInt64Array(plain, 32).length],
  ["length past the end", () => new BigUint64Array(plain, 8, 3).length],
  ["negative view length", () => new BigInt64Array(shared, 8, -1).length],
  ["odd buffer length", () => new BigInt64Array(new ArrayBuffer(12)).length],
  ["odd shared length", () => new BigUint64Array(new SharedArrayBuffer(20), 8).length],
  ["Int32Array misaligned", () => new Int32Array(plain, 2).length],
  ["Int32Array past the end", () => new Int32Array(plain, 28).length],
  ["Int16Array length", () => new Int16Array(plain, 4, 11).length],
  ["Float64Array odd buffer", () => new Float64Array(new ArrayBuffer(10), 0).length],
];
for (const [name, make] of attempts) {
  try {
    console.log(name, "length", make());
  } catch (error) {
    console.log(name, (error as Error).name, (error as Error).message);
  }
}

class Slots {
  counts: BigInt64Array | null = null;
  readonly totals: BigUint64Array;
  constructor(totals: BigUint64Array) {
    this.totals = totals;
  }
}

function allocate(n: number): BigInt64Array {
  const a = new BigInt64Array(n);
  for (let i = 0; i < n; i++) a[i] = BigInt(i) - 1n;
  return a;
}

function total(a: BigInt64Array | null): bigint {
  if (a === null) return -1n;
  let sum = 0n;
  for (let i = 0; i < a.length; i++) sum += a[i]!;
  return sum;
}

const slots = new Slots(tail);
console.log(total(slots.counts));
slots.counts = allocate(5);
console.log(total(slots.counts), slots.totals[3]);
const byOwner = new WeakMap<object, BigUint64Array>();
const owner = {};
byOwner.set(owner, slots.totals);
const found = byOwner.get(owner);
console.log(found === undefined ? "missing" : found[0], byOwner.get({}) === undefined);
let maybe: BigInt64Array | null = null;
console.log(maybe === null);
maybe = slots.counts;
if (maybe !== null) console.log(maybe.length, maybe[4]);
