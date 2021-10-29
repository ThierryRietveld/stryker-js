const arr6: number[] = [];
const arr7: string[] = [];
const arr8: Date[] = [];
const arr9: any[] = [];
const arr10: unknown[] = [];

class TestClass {
  private arr6: number[] = [];
  private arr7: string[] = [];
  private arr8: Date[] = [];
  private arr9: any[] = [];
  private arr10: unknown[] = [];

  constructor() {
    this.a();
    this.arr6.length;
    this.arr7.length;
    this.arr8.length;
    this.arr9.length;
    this.arr10.length;
  }

  private a() {
    this.arr6 = [];
    this.arr7 = [];
    this.arr8 = [];
    this.arr9 = [];
    this.arr10 = [];
  }
}

function assertIsString(val: any): asserts val is string {
  if (typeof val !== 'string') {
    throw new Error('Not a string!');
  }
}

function testFunction(): number {
  return 2;
}

function* generatorFunction(): Iterable<number> {
  yield 5;
}

function returnPromise(): Promise<void> {
  return Promise.resolve();
}

async function sdfj(): Promise<void> {
  return;
}
