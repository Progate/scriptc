// A string-keyed dictionary type that also receives an existing record
// (written through by `fill`) is kept as the checked-dynamic object. Its
// reads of keys it does not hold answer undefined, so defaults, guards and
// comparisons around those reads take the missing side.
type Pair = { first: string; last: string };

const fill = (target: Record<string, string>, key: string): void => {
  target[key] = "filled";
};
const pair: Pair = { first: "a", last: "b" };
fill(pair, "first");
console.log(pair.first, pair.last);

const userOf = (env: Readonly<Record<string, string>>): string =>
  env.USER ?? env.LOGNAME ?? (env.HOME === "/root" ? "root" : "user");
const keyed = (env: Record<string, string>, key: string): string => env[key] ?? "none";
const literalKey = (env: Record<string, string>): string => env["HOME"] ?? "no home";
const chained = (env: Record<string, string> | undefined): string => env?.USER ?? "no user";
const either = (env: Record<string, string>): string => env.USER || "empty";
const compared = (env: Record<string, string>): string =>
  env.USER === undefined ? "undefined" : `set ${env.USER}`;
const guarded = (env: Record<string, string>): string => (env.SHELL ? env.SHELL : "no shell");

const built: Record<string, string> = { PATH: "/bin", HOME: "/root" };
const spread: Record<string, string> = { PATH: "/bin", ...{ LOGNAME: "spread" } };
console.log(userOf(built), userOf(spread), userOf({}), userOf({ USER: "named" }));
console.log(keyed({}, "x"), keyed({ x: "1" }, "x"), literalKey({}), literalKey(built));
console.log(chained(undefined), chained({}), chained({ USER: "u" }));
console.log(either({}), either({ USER: "" }), either({ USER: "v" }));
console.log(compared({}), compared({ USER: "w" }), guarded({}), guarded({ SHELL: "/bin/sh" }));
