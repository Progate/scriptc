// Array predicates that answer a bigint (a bit test against a mask): the
// array methods take its ToBoolean, where 0n is the only falsy value.
type SignalInfo = { readonly signo: number; readonly sigq?: number };
const bit = (signo: number): bigint => 1n << BigInt(signo - 1);
const queue: SignalInfo[] = [{ signo: 2 }, { signo: 10, sigq: 1 }, { signo: 15 }, { signo: 64 }];
const masks = [bit(2) | bit(15), bit(64), 0n, bit(2) | bit(10) | bit(15) | bit(64)];

for (const pending of masks) {
  const held = (info: SignalInfo): bigint => pending & bit(info.signo);
  console.log(
    queue.every((info) => pending & bit(info.signo)),
    queue.some(held),
    queue.filter((info) => pending & bit(info.signo)).map((info) => info.signo).join(","),
    queue.find((info) => pending & bit(info.signo))?.signo,
    queue.findIndex(held),
    queue.findLast((info) => pending & bit(info.signo))?.signo,
    queue.findLastIndex(held),
  );
}
const flags = [3n, 0n, 5n];
console.log(flags.filter((flag) => flag).length, flags.every((flag) => flag), flags.some((flag, index) => flag * BigInt(index)));
