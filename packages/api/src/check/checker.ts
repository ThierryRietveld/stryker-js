import { MutantRunPlan } from '../core/index.js';

import { CheckResult } from './check-result.js';

export interface Checker {
  init(): Promise<void>;

  check(mutant: MutantRunPlan[]): Promise<Record<string, CheckResult>>;

  createGroups?(mutants: MutantRunPlan[]): Promise<MutantRunPlan[][] | undefined>;
}
