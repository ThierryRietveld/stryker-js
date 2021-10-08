const a: number | null = 2;

class Test {
  /**
   * name
   */
  public async method(): Promise<void> {
    console.log();
  }

  public method2(): string {
    return '';
  }
}

function b(): number {
  return 3;
}

function c(): any {
  return 3;
}

function d(): void {
  console.log('2323');
}

function* generator(): Iterable<void> {
  console.log();
}

function* generator2(): Iterable<number> {
  console.log();
}
