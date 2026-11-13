// Compound assignment to elements of bigint arrays: `counters[i]! += 1n`.
type Counters = { packets: bigint[]; bytes: bigint[] };

const table: Counters = { packets: [0n, 0n, 0n], bytes: [0n, 0n, 0n] };
const sizes = [60, 1500, 576, 40, 9000];
for (let i = 0; i < sizes.length; i++) {
  const rule = i % 3;
  table.packets[rule]! += 1n;
  table.bytes[rule]! += BigInt(sizes[i]!);
}
console.log(
  table.packets.map(String).join(","),
  table.bytes.map(String).join(","),
);

const values: bigint[] = [10n, 3n, 255n, 1n];
values[0] -= 4n;
values[1] *= 7n;
values[2] &= 0x0fn;
values[3] <<= 40n;
values[0] /= 4n;
values[1] %= 5n;
values[2] |= 0x100n;
values[2] ^= 1n;
values[3] >>= 8n;
values[0] **= 3n;
console.log(values.map(String).join(" "));

// The compound is an expression whose value is the new element.
const big: bigint[] = [1n];
const seen: bigint[] = [];
for (let i = 0; i < 4; i++) seen.push((big[0]! *= 1000n));
console.log(seen.map(String).join(" "), big[0]);

// The right side runs before the old value meets the operator.
let calls = 0;
const step = (): bigint => {
  calls++;
  return 2n;
};
const sparse: bigint[] = [5n];
try {
  sparse[3]! += step();
} catch (error) {
  console.log(
    (error as Error).name,
    (error as Error).message,
    calls,
    sparse.length,
  );
}
sparse[0]! += step();
console.log(sparse[0], calls);
