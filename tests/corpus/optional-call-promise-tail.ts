// `f?.().catch(h)` and `f?.().then(...)` on a function value that can be
// nullish: the whole tail short-circuits with the call.
class Session {
  #unsubscribe: (() => Promise<void>) | null = null;
  #lines: string[] = [];
  #log(message: string): void {
    this.#lines.push(message);
  }
  subscribe(fail: boolean): void {
    this.#unsubscribe = async () => {
      this.#log(`unsubscribing (fail=${fail})`);
      if (fail) throw new Error("bus closed");
    };
  }
  destroy(): void {
    void this.#unsubscribe?.().catch(() => undefined);
  }
  async update(): Promise<void> {
    const unsubscribe = this.#unsubscribe;
    this.#unsubscribe = null;
    await unsubscribe?.().catch((error: unknown) =>
      this.#log(`unable to remove rule: ${error instanceof Error ? error.message : String(error)}`),
    );
    this.#log("updated");
  }
  get lines(): string {
    return this.#lines.join(" | ");
  }
}

let doubler: ((n: number) => Promise<number>) | undefined;

async function main(): Promise<void> {
  const session = new Session();
  session.destroy();
  await session.update();
  session.subscribe(true);
  session.destroy();
  await session.update();
  session.subscribe(false);
  await session.update();
  await session.update();
  console.log(session.lines);

  console.log(doubler?.(1).then((v) => v + 1) === undefined);
  doubler = async (n) => n * 2;
  const result = await doubler?.(21)
    .then((v) => v + 1)
    .finally(() => console.log("settled"));
  console.log(result);
}

main();
