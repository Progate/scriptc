// TypedArray.from with a mapper over sources whose type is a union of
// strings, arrays and typed arrays.
const codes = (source: string | number[] | Uint8Array): Uint8Array =>
  Uint8Array.from(source as Iterable<string | number>, (item) =>
    typeof item === "string" ? item.charCodeAt(0) : item * 2,
  );
console.log(codes("AZ"), codes([1, 2, 3]), codes(new Uint8Array([7, 8])));

const lengths = (source: string | string[] | undefined): Int16Array =>
  Int16Array.from(source ?? "", (item, index) => item.length * 10 + index);
console.log(lengths(["a", "bcd"]), lengths("xy"), lengths(undefined));

const textOf = (bytes: string): string =>
  new TextDecoder().decode(Uint8Array.from(bytes, (char) => char.charCodeAt(0)));
console.log(["\xe3\x81\x82", "ok"].map(textOf));
