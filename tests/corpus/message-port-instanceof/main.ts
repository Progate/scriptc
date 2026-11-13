// `value instanceof MessagePort` on untyped values: finding the ports a
// configuration object carries, so they can be listed for transfer.
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

const { port1, port2 } = new MessageChannel();
const other = new MessageChannel();
const config: unknown = {
  name: "worker",
  stdio: [port1, { nested: other.port2 }],
  count: 3,
  flags: [true, "x", null],
};
const ports = portsIn(config);
console.log(ports.length, ports[0] === port1, ports[1] === other.port2);
console.log(portsIn([1, "two", { three: 3 }]).length, portsIn(null).length, portsIn(port2).length);
const maybe: unknown = new Uint8Array(2);
console.log(maybe instanceof MessagePort, (port2 as unknown) instanceof MessagePort);
for (const port of [port1, port2, other.port1, other.port2]) port.close();
