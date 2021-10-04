import { Mutant } from '../core';

import { CheckResult } from './check-result';

export interface Checker {
  init(): Promise<void>;
  initMutants?(mutants: Mutant[]): void;

  check(mutant: Mutant): Promise<CheckResult>;
}
