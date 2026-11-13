// `"member" in Atomics` and the other standard namespace objects: feature
// probes answer from the object's own properties and the ones it inherits.
const requireWaitAsync = (): void => {
  if (!("waitAsync" in Atomics)) throw new Error("no Atomics.waitAsync");
};
requireWaitAsync();

const PROBES = "probe";
console.log(
  "waitAsync" in Atomics,
  "pause" in Atomics,
  "notify" in Atomics,
  `wait${"Sync"}` in Atomics,
  PROBES in Atomics,
);
console.log("PI" in Math, "sumPrecise" in Math, "f16round" in Math, "imul" in Math);
console.log("rawJSON" in JSON, "isRawJSON" in JSON, "stringify" in JSON);
console.log("ownKeys" in Reflect, "enumerate" in Reflect);
// Inherited from Object.prototype.
console.log("toString" in Atomics, "hasOwnProperty" in Math, "constructor" in JSON);

const pick = (): string => ("waitAsync" in Atomics ? "native wait" : "polling");
console.log(pick());
