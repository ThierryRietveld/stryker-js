import { MutantResult, MutantTestCoverage, StrykerOptions } from '@stryker-mutator/api/core';
import { I } from '@stryker-mutator/util';
import { EMPTY, firstValueFrom, from, lastValueFrom, merge, Observable, of, Subject, toArray } from 'rxjs';
import { Logger } from '@stryker-mutator/api/logging';
import { CheckStatus } from '@stryker-mutator/api/check';
import { tokens, commonTokens } from '@stryker-mutator/api/plugin';

import { ConcurrencyTokenProvider, Pool } from '../concurrent';
import { MutationTestReportHelper } from '../reporters/mutation-test-report-helper';
import { coreTokens } from '../di';

import { CheckerResource } from './checker-resource';

export class CheckerFacade {
  public static inject = tokens(
    commonTokens.options,
    coreTokens.checkerPool,
    commonTokens.logger,
    coreTokens.concurrencyTokenProvider,
    coreTokens.mutationTestReportHelper
  );

  constructor(
    private readonly options: StrykerOptions,
    private readonly checkerPool: I<Pool<CheckerResource>>,
    private readonly log: Logger,
    private readonly concurrencyTokenProvider: I<ConcurrencyTokenProvider>,
    private readonly mutationTestReportHelper: I<MutationTestReportHelper>
  ) {}

  public executeCheck(input$: Observable<MutantTestCoverage>): {
    checkResult$: Observable<MutantResult>;
    passedMutant$: Observable<MutantTestCoverage>;
  } {
    if (!this.options.checkers.length) {
      return {
        checkResult$: EMPTY,
        passedMutant$: input$,
      };
    }

    const checkResult$ = new Subject<MutantResult>();
    let previousPassedMutants$ = input$;

    for (const checkerName of this.options.checkers) {
      const passedMutants$ = new Subject<MutantTestCoverage>();
      this.executeChecker(checkerName, previousPassedMutants$, checkResult$, passedMutants$);
      previousPassedMutants$ = passedMutants$;
    }

    previousPassedMutants$.subscribe({
      complete: () => {
        this.log.debug('Checker(s) finished.');

        checkResult$.complete();

        this.checkerPool.dispose();
        this.concurrencyTokenProvider.freeCheckers();
      },
    });

    return {
      checkResult$: checkResult$.asObservable(),
      passedMutant$: previousPassedMutants$,
    };
  }

  private async executeChecker(
    checkerName: string,
    previousPassedMutants$: Observable<MutantTestCoverage>,
    checkResult$: Subject<MutantResult>,
    passedMutant$: Subject<MutantTestCoverage>
  ) {
    const mutants = await lastValueFrom(merge(previousPassedMutants$).pipe(toArray()));

    const groups = await firstValueFrom(
      this.checkerPool.schedule(of(0), async (checker) => {
        const group = await checker.createGroups?.(checkerName, mutants);
        return group ?? mutants.map((m) => [m]);
      })
    );

    this.log.debug(`${checkerName} created ${groups.length} groups.`);

    const run$ = this.checkerPool.schedule(from(groups), async (checker, mutantGroup) => {
      const results = await checker.check(checkerName, mutantGroup);
      Object.entries(results).forEach(([id, result]) => {
        const mutant = mutantGroup.find((m) => m.id === id)!;
        if (result.status === CheckStatus.Passed) passedMutant$.next(mutant);
        else checkResult$.next(this.mutationTestReportHelper.reportCheckFailed(mutant, result));
      });
    });

    await lastValueFrom(run$);
    passedMutant$.complete();
  }
}
