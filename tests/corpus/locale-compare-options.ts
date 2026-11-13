// localeCompare with a locale and options: the root collation with numeric
// ordering and each sensitivity.
const names = ["file10.issue", "file9.issue", "file010.issue", "File2.issue", "file1.issue", "a.issue", "b2c10", "b2c9", "b02c9"];
console.log([...names].sort((a, b) => a.localeCompare(b, "en", { numeric: true })).join(" "));
console.log([...names].sort((a, b) => a.localeCompare(b, undefined, { numeric: false })).join(" "));
console.log([...names].sort((a, b) => a.localeCompare(b, "en-US")).join(" "));

const pairs: [string, string][] = [
  ["01", "1"],
  ["a01b", "a1c"],
  ["x2", "X10"],
  ["1.5", "1.10"],
  ["a 2", "a-10"],
  ["007", "7"],
  ["0", "00"],
  ["10", "9"],
  ["99999999999999999999", "100000000000000000000"],
  ["a", "á"],
  ["a", "A"],
  ["ä", "A"],
  ["résumé", "resume"],
  ["Résumé", "résumé"],
  ["straße", "strasse"],
  ["", "0"],
  ["abc", "ABC"],
  ["2a", "2A"],
];
for (const [a, b] of pairs) {
  console.log(
    JSON.stringify(a),
    JSON.stringify(b),
    a.localeCompare(b, "en", { numeric: true }),
    a.localeCompare(b, undefined, { sensitivity: "base" }),
    a.localeCompare(b, undefined, { sensitivity: "accent" }),
    a.localeCompare(b, "en", { sensitivity: "variant", numeric: true }),
    a.localeCompare(b, "en", { numeric: true, sensitivity: "base" }),
  );
}
