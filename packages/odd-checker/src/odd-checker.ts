import { Checker, CheckResult, CheckStatus } from '@stryker-mutator/api/check';
import { tokens, commonTokens, PluginContext, Injector, Scope } from '@stryker-mutator/api/plugin';

import { Logger, LoggerFactoryMethod } from '@stryker-mutator/api/logging';
import { MutantTestCoverage } from '@stryker-mutator/api/src/core';

oddCheckerLoggerFactory.inject = tokens(commonTokens.getLogger, commonTokens.target);
// eslint-disable-next-line @typescript-eslint/ban-types
function oddCheckerLoggerFactory(loggerFactory: LoggerFactoryMethod, target: Function | undefined) {
  const targetName = target?.name ?? OddChecker.name;
  const category = targetName === OddChecker.name ? OddChecker.name : `${OddChecker.name}.${targetName}`;
  return loggerFactory(category);
}

create.inject = tokens(commonTokens.injector);
export function create(injector: Injector<PluginContext>): OddChecker {
  return injector.provideFactory(commonTokens.logger, oddCheckerLoggerFactory, Scope.Transient).injectClass(OddChecker);
}

class OddChecker implements Checker {
  public static inject = tokens(commonTokens.logger);

  constructor(private readonly logger: Logger) {}

  public async init(): Promise<void> {
    return;
  }

  public async check(mutants: MutantTestCoverage[]): Promise<Array<{ mutant: MutantTestCoverage; checkResult: CheckResult }>> {
    await new Promise((res) => setTimeout(res, 20));
    return mutants.map((mutant) => {
      // this.logger.info(`Checking mutant ${mutant.id}`);
      if (parseInt(mutant.id) % 2 === 1) {
        return {
          mutant,
          checkResult: {
            status: CheckStatus.Passed,
          },
        };
      } else {
        return {
          mutant,
          checkResult: {
            status: CheckStatus.CompileError,
            reason: `Mutant ${mutant.id} is not odd :(`,
          },
        };
      }
    });
  }
}
