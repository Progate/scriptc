// Spreading typed arrays into push and unshift on a number array: the
// elements arrive as numbers, in order, after any other arguments evaluate.
const pending: number[] = [9];
const chunk = new Uint8Array([1, 2, 3]);
console.log(pending.push(...chunk), pending);
console.log(pending.unshift(...new Int16Array([-1, -2])), pending);
pending.push(...new Float32Array([0.5]));
pending.push(...new Uint8Array(0));
pending.push(...chunk.subarray(1));
console.log(pending);
const empty: number[] = [];
empty.push(...new Uint32Array([4294967295]));
console.log(empty, chunk);
