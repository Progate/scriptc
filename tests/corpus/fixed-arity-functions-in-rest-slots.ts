// Fixed-arity functions stored where the slot's signature ends in a typed
// rest parameter, then called with argument arrays of several lengths.
type Handler = (...args: bigint[]) => bigint | number;
type Named = (name: string, ...rest: number[]) => string;

function sum3(a: bigint, b: bigint, c: bigint): bigint | number {
  return a + b + c;
}
function twice(a: bigint): bigint | number {
  return a * 2n;
}
function seven(): bigint | number {
  return 7;
}
function optional(a: bigint, b?: bigint): bigint | number {
  return b === undefined ? -1 : a - b;
}
function defaulted(a: bigint, b: bigint = 100n): bigint {
  return a + b;
}

const table = new Map<number, Handler>();
table.set(0, sum3);
table.set(1, twice);
table.set(2, seven);
table.set(3, optional);
table.set(4, defaulted);
table.set(5, (x: bigint, y: bigint) => x * y);

function dispatch(nr: number, args: bigint[]): bigint | number {
  const handler = table.get(nr);
  if (handler === undefined) return -38;
  return handler(...args);
}

const six: bigint[] = [1n, 2n, 3n, 4n, 5n, 6n];
for (let nr = 0; nr <= 6; nr++) console.log(nr, dispatch(nr, six));
console.log(dispatch(3, [9n]), dispatch(4, [9n]), dispatch(4, [9n, 1n]));
console.log(dispatch(2, []));

// A binding typed with the rest signature, initialized from a function
// whose parameter has a default, holds the adapted function.
const aliased: Handler = defaulted;
console.log(aliased(5n), aliased(5n, 6n), aliased(5n, 6n, 7n));

const list: Handler[] = [sum3, twice];
list.push(seven);
console.log(list.map((h) => h(10n, 20n, 30n, 40n)));

const record: { run: Handler } = { run: twice };
console.log(record.run(21n));

function label(name: string, a: number, b: number): string {
  return `${name}:${a + b}`;
}
const named: Named = label;
console.log(named("x", 1, 2, 3), named("y", 5, 6));

let calls = 0;
const counting: (...xs: string[]) => void = (first: string) => {
  calls++;
  console.log("first", first);
};
counting("a", "b");
counting("c");
console.log("calls", calls);

// A missing argument for a parameter whose type excludes undefined: Node.js
// binds undefined and the addition throws; the compiled adapter's checked
// read throws first. Both are TypeErrors.
try {
  console.log(dispatch(0, [1n]));
} catch (e) {
  console.log("missing argument", e instanceof TypeError);
}
