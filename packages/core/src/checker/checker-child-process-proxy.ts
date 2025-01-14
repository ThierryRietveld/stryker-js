import { CheckResult, CheckStatus } from '@stryker-mutator/api/check';
import { Mutant, MutantTestCoverage, StrykerOptions } from '@stryker-mutator/api/core';
import { Disposable } from 'typed-inject';

import { ChildProcessProxy } from '../child-proxy/child-process-proxy';
import { LoggingClientContext } from '../logging';
import { Resource } from '../concurrent/pool';

import { CheckerWorker } from './checker-worker';
import { CheckerResource } from './checker-resource';

export class CheckerChildProcessProxy implements CheckerResource, Disposable, Resource {
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

  public async dispose(): Promise<void> {
    await this.childProcess?.dispose();
  }

  public async init(): Promise<void> {
    await this.childProcess?.proxy.init();
  }

  public async check(checkerName: string, mutants: Mutant[]): Promise<Record<string, CheckResult>> {
    if (this.childProcess) {
      return this.childProcess.proxy.check(checkerName, mutants);
    }

    const result: Record<string, CheckResult> = {};
    mutants.forEach((mutant) => (result[mutant.id] = { status: CheckStatus.Passed }));

    return result;
  }

  public async createGroups(checkerName: string, mutants: MutantTestCoverage[]): Promise<MutantTestCoverage[][] | undefined> {
    return this.childProcess.proxy.createGroups(checkerName, mutants);
  }
}
