import { CheckResult } from '@stryker-mutator/api/check';
import { MutantRunPlan } from '@stryker-mutator/api/src/core';

import { Resource } from '../concurrent/index.js';

export interface CheckerResource extends Resource {
  check(checkerIndex: number, mutant: MutantRunPlan[]): Promise<Record<string, CheckResult>>;
  createGroups?(checkerIndex: number, mutants: MutantRunPlan[]): Promise<MutantRunPlan[][] | undefined>;
}
