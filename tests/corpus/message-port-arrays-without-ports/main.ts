// A program that looks for MessagePorts in configuration objects but never
// makes a port: the class test answers false and the port arrays it builds
// stay empty.
const portsIn = (value: unknown, seen: Set<object> = new Set()): MessagePort[] => {
  if (value === null || typeof value !== "object") return [];
  if (typeof MessagePort !== "undefined" && value instanceof MessagePort) return [value];
  if (seen.has(value)) return [];
  seen.add(value);
  const found: MessagePort[] = [];
  for (const item of Array.isArray(value) ? value : Object.values(value))
    found.push(...portsIn(item, seen));
  return found;
};

const configs: unknown[] = [
  { name: "plain", argv: ["a", "b"] },
  { name: "nested", stdio: [{ fd: 1 }, null], flags: [true, 2] },
  [],
  "text",
];
const singleUse = configs.filter((config) => portsIn(config).length > 0);
console.log(singleUse.length, portsIn(configs).length, portsIn({ a: { b: { c: [] } } }).length);
const counts = configs.map((config) => portsIn(config).length);
console.log(counts.join(","));
const maybe: unknown = new Uint8Array(1);
console.log(maybe instanceof MessagePort);
