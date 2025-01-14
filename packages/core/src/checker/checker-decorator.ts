import { CheckResult } from '@stryker-mutator/api/check';
import { Mutant } from '@stryker-mutator/api/core';

import { ChildProcessCrashedError } from '../child-proxy/child-process-crashed-error';
import { ResourceDecorator } from '../concurrent';

import { CheckerResource } from './checker-resource';

export class CheckerDecorator extends ResourceDecorator<CheckerResource> {
  public async check(checkerName: string, mutants: Mutant[]): Promise<Record<string, CheckResult>> {
    try {
      return await this.innerResource.check(checkerName, mutants);
    } catch (err) {
      if (err instanceof ChildProcessCrashedError) {
        await this.recover();
        return this.innerResource.check(checkerName, mutants);
      } else {
        throw err; //oops
      }
    }
  }
}
