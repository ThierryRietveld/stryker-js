import * as schema from 'mutation-testing-report-schema/api';

import { MutantRunOptions } from '../test-runner';

export { MutantStatus } from 'mutation-testing-report-schema/api';

// We're reusing the `MutantResult` interface here to acquire uniformity.

/**
 * Represents a mutant in its initial state.
 */
export interface Mutant extends Pick<schema.MutantResult, 'id' | 'location' | 'mutatorName' | 'replacement' | 'statusReason'> {
  /**
   * The file name from which this mutant originated
   */
  fileName: string;
  /**
   * Actual mutation that has been applied.
   */
  replacement: string;
  /**
   * The status if a mutant if known. This should be undefined for a mutant that still needs testing.
   */
  status?: schema.MutantStatus;
}

/**
 * Represents a mutant in its matched-with-the-tests state, ready to be tested.
 */
export type MutantTestCoverage = Mutant & Pick<schema.MutantResult, 'coveredBy' | 'static'>;

/**
 * Represents a mutant in its final state, ready to be reported.
 */
export type MutantResult = Mutant & schema.MutantResult;

/**
 * Copied this from packages/core/mutants/mutant-test-plan.ts
 * I don't know what the best way to bring this type to the api is
 */
export type MutantTestPlan = MutantEarlyResultPlan | MutantRunPlan;

export enum PlanKind {
  EarlyResult = 'EarlyResult',
  Run = 'Run',
}

export interface MutantEarlyResultPlan {
  plan: PlanKind.EarlyResult;
  mutant: MutantTestCoverage & { status: schema.MutantStatus };
}

export interface MutantRunPlan {
  plan: PlanKind.Run;
  mutant: MutantTestCoverage;
  runOptions: MutantRunOptions;
}
