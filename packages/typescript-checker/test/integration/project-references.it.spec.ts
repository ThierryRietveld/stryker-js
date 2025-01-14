import path from 'path';
import fs from 'fs';

import { expect } from 'chai';
import { Location, MutantTestCoverage } from '@stryker-mutator/api/core';
import { CheckResult, CheckStatus } from '@stryker-mutator/api/check';
import { testInjector, factory } from '@stryker-mutator/test-helpers';

import { createTypescriptChecker } from '../../src';
import { TypescriptChecker } from '../../src/typescript-checker';

const resolveTestResource = path.resolve.bind(
  path,
  __dirname,
  '..' /* integration */,
  '..' /* test */,
  '..' /* dist */,
  'testResources',
  'project-references'
) as unknown as typeof path.resolve;

describe('Typescript checker on a project with project references', () => {
  let sut: TypescriptChecker;

  before(() => {
    testInjector.options.tsconfigFile = resolveTestResource('tsconfig.root.json');
    sut = testInjector.injector.injectFunction(createTypescriptChecker);
    return sut.init();
  });

  it('should not write output to disk', () => {
    expect(fs.existsSync(resolveTestResource('dist')), 'Output was written to disk!').false;
  });

  it('should be able to validate a mutant', async () => {
    const mutant = createMutantTestCoverage('src/todo.ts', 'TodoList.allTodos.push(newItem)', 'newItem ? 42 : 43');
    const expectedResult: CheckResult = {
      status: CheckStatus.Passed,
    };
    const actualResult = await sut.check([mutant]);
    expect(actualResult[mutant.id]).deep.eq(expectedResult);
  });

  it('should be able to validate two mutants in the same file', async () => {
    const mutants = [
      createMutantTestCoverage('src/todo.ts', 'TodoList.allTodos.push(newItem)', 'newItem ? 42 : 43'),
      createMutantTestCoverage('src/todo.ts', 'return totalCount;', ''),
    ];
    const expectedResult: CheckResult = {
      status: CheckStatus.Passed,
    };
    const actualResult = await sut.check(mutants);
    expect(actualResult[mutants[0].id]).deep.eq(expectedResult);
    expect(actualResult[mutants[1].id]).deep.eq(expectedResult);
  });

  it('should allow unused local variables (override options)', async () => {
    const mutant = createMutantTestCoverage('src/todo.ts', 'TodoList.allTodos.push(newItem)', '42');
    const expectedResult: CheckResult = {
      status: CheckStatus.Passed,
    };
    const actual = await sut.check([mutant]);
    expect(actual[mutant.id]).deep.eq(expectedResult);
  });
});

const fileContents = Object.freeze({
  ['src/todo.ts']: fs.readFileSync(resolveTestResource('src', 'todo.ts'), 'utf8'),
  ['test/todo.spec.ts']: fs.readFileSync(resolveTestResource('test', 'todo.spec.ts'), 'utf8'),
});

function createMutantTestCoverage(
  fileName: 'src/todo.ts' | 'test/todo.spec.ts',
  findText: string,
  replacement: string,
  offset = 0
): MutantTestCoverage {
  const lines = fileContents[fileName].split('\n');
  const lineNumber = lines.findIndex((l) => l.includes(findText));
  if (lineNumber === -1) {
    throw new Error(`Cannot find ${findText} in ${fileName}`);
  }
  const textColumn = lines[lineNumber].indexOf(findText);
  const location: Location = {
    start: { line: lineNumber, column: textColumn + offset },
    end: { line: lineNumber, column: textColumn + findText.length },
  };
  return factory.mutantTestCoverage({
    fileName: resolveTestResource(fileName),
    mutatorName: 'foo-mutator',
    location,
    replacement,
  });
}
