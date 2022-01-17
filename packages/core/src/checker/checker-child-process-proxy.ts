import { ActiveChecker, Checker, CheckResult, CheckStatus } from '@stryker-mutator/api/check';
import { MutantTestCoverage, StrykerOptions } from '@stryker-mutator/api/core';
import { Disposable } from 'typed-inject';

import { ChildProcessProxy } from '../child-proxy/child-process-proxy';
import { LoggingClientContext } from '../logging';
import { Resource } from '../concurrent/pool';

import { CheckerWorker } from './checker-worker';

export class CheckerChildProcessProxy implements Checker, Disposable, Resource, ActiveChecker {
  private readonly childProcess: ChildProcessProxy<CheckerWorker>;

  constructor(options: StrykerOptions, loggingContext: LoggingClientContext) {
    this.childProcess = ChildProcessProxy.create(
      require.resolve('./checker-worker'),
      loggingContext,
      options,
      {},
      process.cwd(),
      CheckerWorker,
      options.checkerNodeArgs
    );
  }

  public async setActiveChecker(checker: string): Promise<void> {
    await this.childProcess.proxy.setActiveChecker(checker);
  }

  public async dispose(): Promise<void> {
    await this.childProcess?.dispose();
  }

  public async init(): Promise<void> {
    await this.childProcess?.proxy.init();
  }

  public async check(mutants: MutantTestCoverage[]): Promise<Array<{ mutant: MutantTestCoverage; checkResult: CheckResult }>> {
    if (this.childProcess) {
      return this.childProcess.proxy.check(mutants);
    }
    return mutants.map((mutant) => ({
      mutant,
      checkResult: {
        status: CheckStatus.Passed,
      },
    }));
  }

  public async createGroups(mutants: MutantTestCoverage[]): Promise<MutantTestCoverage[][] | undefined> {
    return this.childProcess.proxy.createGroups(mutants);
  }
}
