import { Checker, CheckResult } from '@stryker-mutator/api/check';
import { StrykerOptions, MutantRunPlan } from '@stryker-mutator/api/core';
import { PluginKind, tokens, commonTokens } from '@stryker-mutator/api/plugin';
import { StrykerError } from '@stryker-mutator/util';

import { coreTokens, PluginCreator } from '../di/index.js';

import { CheckerResource } from './checker-resource.js';

export class CheckerWorker implements CheckerResource {
  private readonly innerCheckers: Array<{ name: string; checker: Checker }> = [];

  public static inject = tokens(commonTokens.options, coreTokens.pluginCreator);
  constructor(options: StrykerOptions, pluginCreator: PluginCreator) {
    this.innerCheckers = options.checkers.map((name) => ({ name, checker: pluginCreator.create(PluginKind.Checker, name) }));
  }

  public async init(): Promise<void> {
    for await (const { name, checker } of this.innerCheckers) {
      try {
        await checker.init();
      } catch (error: unknown) {
        throw new StrykerError(`An error occurred during initialization of the "${name}" checker`, error);
      }
    }
  }

  public async check(checkerIndex: number, mutants: MutantRunPlan[]): Promise<Record<string, CheckResult>> {
    return this.innerCheckers[checkerIndex].checker.check(mutants);
  }

  public async createGroups(checkerIndex: number, mutants: MutantRunPlan[]): Promise<MutantRunPlan[][] | undefined> {
    return this.innerCheckers[checkerIndex].checker.createGroups?.(mutants);
  }
}
