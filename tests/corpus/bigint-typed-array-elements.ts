// BigInt64Array and BigUint64Array element reads and writes: a write keeps
// the bigint's low 64 bits (BigInt.asIntN or asUintN of 64), so large and
// negative values wrap by the array's signedness; a read answers a bigint,
// or undefined at an index outside [0, length) or not an integer; a write
// there is ignored. Read values take part in ordinary bigint arithmetic,
// comparison and Number conversion.
const signed = new BigInt64Array(6);
const unsigned = new BigUint64Array(signed.buffer);

const values = [
  0n,
  1n,
  -1n,
  2n ** 63n - 1n,
  2n ** 63n,
  -(2n ** 63n),
  -(2n ** 63n) - 1n,
  2n ** 64n,
  2n ** 64n + 5n,
  -(2n ** 64n) - 5n,
  2n ** 100n + 3n,
  -123456789012345678901234567890n,
];
for (const value of values) {
  signed[0] = value;
  unsigned[1] = value;
  console.log(
    String(value),
    signed[0],
    unsigned[0],
    signed[1],
    unsigned[1],
    signed[0] === BigInt.asIntN(64, value),
    unsigned[1] === BigInt.asUintN(64, value),
  );
}

// The two views share storage: each sees the other's writes.
signed[2] = -42n;
unsigned[3] = 2n ** 64n - 42n;
console.log(unsigned[2], signed[3], signed[2] === signed[3]);

// Reads outside the array answer undefined, as Node does.
const shown = (index: number): string => {
  const value = signed[index];
  return value === undefined ? "undefined" : `${value}n`;
};
console.log([-1, 6, 7, 1.5, NaN, Infinity, -0, 2 ** 53].map(shown).join(" "));
console.log(signed[6], unsigned[-1], signed[2.5], typeof signed[10], signed[100] ?? "none");

// Writes outside the array do nothing.
signed[6] = 1n;
signed[-1] = 2n;
signed[1.5] = 3n;
unsigned[NaN] = 4n;
console.log(signed.length, signed[5], signed[1], unsigned[0]);

// Read values are ordinary bigints.
signed[4] = 2n ** 62n;
signed[5] = -7n;
const product = signed[4]! * 4n;
console.log(product, BigInt.asIntN(64, product), signed[5]! % 3n, signed[5]! < 0n, -signed[5]!);
console.log(Number(signed[5]), Number(signed[4]), Number(unsigned[3]), Number(signed[4]) + 1);
console.log(`${signed[5]}`, String(unsigned[5]), signed[5]!.toString(16), unsigned[5]!.toString(2).length);
let sum = 0n;
for (let i = 0; i < signed.length; i++) sum += signed[i]!;
console.log(sum, BigInt.asIntN(64, sum));

// Writes take the value expression's result after the index evaluates.
let calls = 0;
const next = (): bigint => {
  calls++;
  return BigInt(calls) * -10n;
};
const at = (): number => {
  calls += 100;
  return 0;
};
signed[at()] = next();
console.log(signed[0], calls);
