// Promise.all over an array of `Promise<void> | null`: a source answers a
// promise for the entries it is still loading and null for the rest, and
// the caller waits for all of them without reading the values.
const log: string[] = [];
const loading = new Map<string, Promise<void>>();
const pending = (path: string): Promise<void> | null => loading.get(path) ?? null;
const load = (path: string, ticks: number): void => {
  let p: Promise<void> = Promise.resolve();
  for (let i = 0; i < ticks; i++) p = p.then(() => undefined);
  loading.set(
    path,
    p.then(() => {
      log.push(`loaded ${path}`);
    }),
  );
};

const prepare = async (paths: string[]): Promise<void> => {
  await Promise.all(paths.map((path) => pending(path)));
  log.push(`ready ${paths.join(",")}`);
};

const failing = async (): Promise<void> => {
  const entries: (Promise<void> | null)[] = [null, Promise.reject(new Error("missing")), null];
  try {
    await Promise.all(entries);
  } catch (error) {
    log.push(`failed ${(error as Error).message}`);
  }
};

const main = async (): Promise<void> => {
  load("/bin/a", 3);
  load("/bin/c", 1);
  await prepare(["/bin/a", "/bin/b", "/bin/c"]);
  await prepare(["/bin/none"]);
  await prepare([]);
  void Promise.all([pending("/bin/a"), null]).then(() => log.push("then"));
  await failing();
  console.log(log.join("\n"));
};
main();
