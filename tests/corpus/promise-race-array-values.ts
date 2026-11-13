// Promise.race over an array value of one promise type: children are waited
// for in the order they finish, as wait(2) does.
type Wait = { pid: number; done: Promise<{ code: number; signal: number | null }> };

const exit = (pid: number, ms: number, code: number): Wait => ({
  pid,
  done: new Promise((resolve) => setTimeout(() => resolve({ code, signal: code > 128 ? code - 128 : null }), ms)),
});

async function reap(waits: Wait[]): Promise<string[]> {
  const order: string[] = [];
  while (waits.length > 0) {
    const finished = await Promise.race(waits.map((wait) => wait.done.then((result) => ({ wait, result }))));
    waits.splice(waits.indexOf(finished.wait), 1);
    const { code, signal } = finished.result;
    order.push(`${finished.wait.pid}:${code}:${signal ?? "-"}`);
  }
  return order;
}

async function main(): Promise<void> {
  console.log((await reap([exit(10, 30, 0), exit(11, 10, 1), exit(12, 20, 137)])).join(" "));
  const settled = [Promise.resolve(1), Promise.resolve(2)];
  console.log(await Promise.race(settled));
  const failing: Promise<number>[] = [
    new Promise((resolve) => setTimeout(() => resolve(5), 20)),
    new Promise((_, reject) => setTimeout(() => reject(new Error("first failure")), 5)),
  ];
  try {
    await Promise.race(failing);
  } catch (error) {
    console.log("rejected:", (error as Error).message);
  }
  const names = ["a", "bb", "ccc"];
  const lengths = names.map(async (name) => {
    await new Promise((resolve) => setTimeout(resolve, 10 * (4 - name.length)));
    return name.length;
  });
  console.log(await Promise.race(lengths));
}

main();
