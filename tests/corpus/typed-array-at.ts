// Typed-array at(): relative indices, out-of-range reads, fractional and
// non-finite positions, across element kinds.
const b = new Uint8Array([1, 2, 3]);
console.log(b.at(0), b.at(-1), b.at(5), b.at(-4), b.at(1.9), b.at(-1.5), b.at(NaN));
console.log(b.at(Infinity), b.at(-Infinity), b.at(-3));
const last = b.at(-1) ?? 0;
console.log(last + 1);
const f = new Float64Array([0.5, -2.25]);
console.log(f.at(-1), f.at(2));
const i = new Int16Array([-7, 8, -9]);
console.log(i.at(-2), new Uint32Array(0).at(0));
const text = (bytes: Uint8Array): string => (bytes.at(-1) === 10 ? "line" : "partial");
console.log(text(new Uint8Array([65, 10])), text(new Uint8Array([65])), text(new Uint8Array(0)));
const sub = b.subarray(1);
console.log(sub.at(-1), sub.at(-3));
