// Function literals written for a slot whose signature is only a typed
// rest parameter, naming their own leading parameters and a rest of their
// own. The checker types the leading parameters as optional, since the slot
// requires no argument; each call here passes at least as many.
type Handler = (...args: bigint[]) => bigint | number;

const table = new Map<number, Handler>();
function define(nr: number, h: Handler): void {
  table.set(nr, h);
}
function handler(nr: number): Handler | undefined {
  return table.get(nr);
}

define(1, (a, b) => a + b);
const previous = handler(1);
// A later definition wraps the earlier one and forwards its whole list.
define(1, (a, b, c, ...rest) => {
  if (rest.length === 0) return previous ? previous(a, b, c) : -1;
  rest.push(100n);
  return a * b * c + BigInt(rest.length);
});
define(2, (fd, request, ...rest) => {
  const passed = rest.length;
  return fd - request + BigInt(passed);
});
define(3, (...all) => {
  let sum = 0n;
  for (const x of all) sum += x;
  return sum;
});

const call = (nr: number, args: bigint[]): bigint | number => {
  const h = handler(nr);
  return h === undefined ? -38 : h(...args);
};

const six: bigint[] = [2n, 3n, 4n, 5n, 6n, 7n];
console.log(call(1, six), call(1, [2n, 3n, 4n]), call(2, six), call(2, [10n, 4n]));
console.log(call(3, six), call(3, []), call(9, six));
// The rest array a function receives is its own: its push above did not
// grow the caller's array.
console.log(six.length);
