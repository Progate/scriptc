// `as const` tuples with an empty tuple element: the element types are read
// from the tuple's positions.
const header = [8, []] as const;
const nested = [["fid", "u32"], [], 3] as const;
const schemas = {
  Tversion: [100, [["msize", "u32"], ["version", "s"]]],
  Tflush: [108, []],
} as const;

console.log(header[0], header[1].length, JSON.stringify(header));
console.log(nested[0][0], nested[0][1], nested[1].length, nested[2], nested.length);
console.log(schemas.Tversion[0], schemas.Tversion[1][1][0], schemas.Tflush[0], schemas.Tflush[1].length);
const total = header[0] + nested[2] + schemas.Tflush[0];
console.log(total);
