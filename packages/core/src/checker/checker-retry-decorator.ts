import { CheckResult } from '@stryker-mutator/api/check';
import { Mutant, MutantTestCoverage } from '@stryker-mutator/api/core';
import { Logger } from '@stryker-mutator/api/logging';

import { ChildProcessCrashedError } from '../child-proxy/child-process-crashed-error';
import { OutOfMemoryError } from '../child-proxy/out-of-memory-error';
import { ResourceDecorator } from '../concurrent';

import { CheckerResource } from './checker-resource';

export class CheckerRetryDecorator extends ResourceDecorator<CheckerResource> implements CheckerResource {
  constructor(producer: () => CheckerResource, private readonly log: Logger) {
    super(producer);
  }

  public async check(checkerName: string, mutants: Mutant[]): Promise<Record<string, CheckResult>> {
    try {
      return await this.innerResource.check(checkerName, mutants);
    } catch (error) {
      if (error instanceof ChildProcessCrashedError) {
        if (error instanceof OutOfMemoryError) {
          this.log.warn(`Checker process [${error.pid}] ran out of memory. Retrying in a new process.`);
        } else {
          this.log.warn(`Checker process [${error.pid}] crashed with exit code ${error.exitCode}. Retrying in a new process.`, error);
        }
        await this.recover();
        return this.innerResource.check(checkerName, mutants);
      } else {
        throw error; //oops
      }
    }
  }

  public async createGroups(checkerName: string, mutants: MutantTestCoverage[]): Promise<MutantTestCoverage[][] | undefined> {
    return this.innerResource.createGroups?.(checkerName, mutants);
  }
}
