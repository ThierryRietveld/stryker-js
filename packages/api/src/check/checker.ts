import { CheckerTimeResult, MutantTime } from '.';
import { Mutant } from '../core';

import { CheckResult } from './check-result';

export interface Checker {
  init(): Promise<void>;

  check(mutant: Mutant): Promise<CheckResult>;

  end?(): Promise<MutantTime[]>;
}
