import { TestRunner, DryRunResult, DryRunOptions, MutantRunOptions, MutantRunResult } from '@stryker-mutator/api/test-runner';
import { HybridFileSystem, TypescriptChecker } from '@stryker-mutator/typescript-checker';
import { tokens, commonTokens, PluginContext, Injector, Scope } from '@stryker-mutator/api/plugin';
import { Logger, LoggerFactoryMethod } from '@stryker-mutator/api/logging';
import { Checker, CheckResult } from '@stryker-mutator/api/check';
import { Mutant, StrykerOptions } from '@stryker-mutator/api/core';
import { NanoSecondsTimer } from '@stryker-mutator/typescript-checker-runner';
import { CheckerTimeResult, MutantTime } from '@stryker-mutator/api/check';

customTypescriptCheckerLoggerFactory.inject = tokens(commonTokens.getLogger, commonTokens.target);
// eslint-disable-next-line @typescript-eslint/ban-types
function customTypescriptCheckerLoggerFactory(loggerFactory: LoggerFactoryMethod, target: Function | undefined) {
  const targetName = target?.name ?? CustomTypescriptChecker.name;
  const category = targetName === CustomTypescriptChecker.name ? CustomTypescriptChecker.name : `${CustomTypescriptChecker.name}.${targetName}`;
  return loggerFactory(category);
}

create.inject = tokens(commonTokens.injector);
export function create(injector: Injector<PluginContext>): CustomTypescriptChecker {
  return injector.provideFactory(commonTokens.logger, customTypescriptCheckerLoggerFactory, Scope.Transient).provideClass('fs', HybridFileSystem).injectClass(CustomTypescriptChecker);
}

export default class CustomTypescriptChecker implements Checker {
    public static inject = tokens(commonTokens.logger, commonTokens.options, 'fs');
    private typescriptChecker: TypescriptChecker;
    private checkerTotalTime: number = 0;
    private checkerAmount: number = 0;
    private highestCheckTime: number;
    private mutantTimes: MutantTime[] = []; 

    constructor(private readonly logger: Logger, options: StrykerOptions, fs: HybridFileSystem) {
        this.typescriptChecker = new TypescriptChecker(logger, options, fs);
    }

    init(): Promise<void> {
        return this.typescriptChecker.init();
    }

    async check(mutant: Mutant): Promise<CheckResult> {
        const mutantTime: MutantTime = {
          mutant,
          timeInS: -1
        }

        const startTime = Number(process.hrtime.bigint());

        const promise = await this.typescriptChecker.check(mutant);

        const endTime = Number(process.hrtime.bigint());

        mutantTime.timeInS = (endTime - startTime) / 1000000000;

        this.mutantTimes.push(mutantTime);
        return promise;
    }

    public async end(): Promise<MutantTime[]> {
      return this.mutantTimes;
    }
}