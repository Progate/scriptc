// Members of a callable object type read through optional chains: a
// receiver that cannot be nullish makes `?.` a plain read, and a nullable
// one short-circuits to undefined.
type Credentials = { euid: number; groups: number[] };
type View = {
  getCredentials?: () => Credentials;
  setSession: () => number;
};
type Spawn = {
  (path: string, args?: string[]): Promise<number>;
  readonly syncView?: View;
  readonly label?: string;
};
type Context = { spawn: Spawn; maybe?: Spawn; pid: number };

function makeSpawn(withView: boolean): Spawn {
  const view: View = {
    getCredentials: () => ({ euid: 1000, groups: [4, 27] }),
    setSession: () => 0,
  };
  const fn = async (path: string, args?: string[]): Promise<number> =>
    path.length + (args?.length ?? 0);
  return withView ? Object.assign(fn, { syncView: view, label: "full" }) : fn;
}

async function main(): Promise<void> {
  const context: Context = { spawn: makeSpawn(true), pid: 3 };
  const cred = context.spawn?.syncView?.getCredentials?.() ?? null;
  console.log(cred?.euid, cred?.groups.join(","));
  console.log(context.spawn?.syncView?.setSession());
  console.log(context.spawn?.label, context.spawn.label?.toUpperCase());
  console.log(await context.spawn("/bin/true", ["a", "b"]));

  const bare: Context = { spawn: makeSpawn(false), pid: 4 };
  console.log(bare.spawn?.syncView?.getCredentials?.() ?? null);
  console.log(bare.spawn?.label ?? "no label", typeof bare.spawn?.syncView);

  const absent: Context = { spawn: makeSpawn(false), pid: 5 };
  console.log(absent.maybe?.syncView?.setSession(), absent.maybe?.label);
  absent.maybe = context.spawn;
  console.log(absent.maybe?.syncView?.setSession(), absent.maybe?.label);

  const view = context.spawn?.syncView;
  if (view !== undefined) console.log(typeof view, view.setSession());
  console.log(typeof context.spawn, Object.keys(context.spawn).join(","));
}

main();
