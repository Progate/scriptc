// ArrayLike<number> parameters, fields and elements fed number arrays and
// typed arrays of several element kinds, read through length and indices.
const formatIpv4 = (octets: ArrayLike<number>): string => Array.from(octets).join(".");
const addressOf = (bytes: ArrayLike<number>): number =>
  ((bytes[0]! << 24) | (bytes[1]! << 16) | (bytes[2]! << 8) | bytes[3]!) >>> 0;
const feed = (bytes: ArrayLike<number>): number => {
  let s = 0;
  for (let i = 0; i < bytes.length; i++) s += bytes[i]!;
  return s;
};
const u8 = new Uint8Array([10, 0, 0, 1]);
console.log(formatIpv4(u8), formatIpv4([1, 2, 3, 4]), addressOf([192, 168, 0, 1]), addressOf(u8));
console.log(feed(new Uint16Array([1000, 2000])), feed(new Float64Array([0.5, 0.25])), feed([]));
const sub: Uint8Array | number[] = Math.random() > 2 ? [1] : new Uint8Array([7, 8]);
console.log(feed(sub), Array.from(sub as ArrayLike<number>).slice(1));
const view: ArrayLike<number> = u8.subarray(1);
console.log(view.length, view[0], view[5]);
const sum = (xs: ArrayLike<number>): number => { let s = 0; for (let i = 0; i < xs.length; i++) s += xs[i]!; return s; };
const ro: readonly number[] = [1, 2, 3];
const holder: { data: ArrayLike<number> } = { data: new Int8Array([-1, -2]) };
const list: ArrayLike<number>[] = [ro, new Uint32Array([5]), holder.data];
console.log(sum(ro), sum(holder.data), list.map(sum));
