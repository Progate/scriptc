// '.map' over a readonly tuple whose callback returns a function: the
// result is an array of functions, as it is for an array receiver.
type Sig = "SIGINT" | "SIGTERM" | "SIGHUP";
interface Info { pid: number }
interface Signals {
  on(signal: Sig, listener: (signal: Sig, info: Info) => void): () => void;
}
interface Ctx { signals: Signals }
const listeners = new Map<Sig, Set<(s: Sig, i: Info) => void>>();
const ctx: Ctx = {
  signals: {
    on(signal, listener) {
      let set = listeners.get(signal);
      if (!set) listeners.set(signal, (set = new Set()));
      set.add(listener);
      return () => { set!.delete(listener); };
    },
  },
};
const run = (context: Ctx): void => {
  const handled = ["SIGINT", "SIGTERM"] as const;
  const offs = [
    ...handled.map((name) => context.signals.on(name, () => console.log("got", name))),
    ...(["SIGHUP"] as const).map((name) => context.signals.on(name, () => undefined)),
  ];
  for (const [s, set] of listeners) for (const l of set) l(s, { pid: 1 });
  for (const off of offs) off();
  console.log([...listeners.values()].map((s) => s.size));
};
run(ctx);

const names = ["a", "b"] as const;
const thunks = names.map((n) => () => console.log(n));
for (const o of thunks) o();
const lengths = names.map((n) => n.length);
console.log(lengths);
