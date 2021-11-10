import { EOL } from 'os';

import { appendFile, writeFile } from 'fs';

import { Checker, CheckResult, CheckStatus } from '@stryker-mutator/api/check';
import { tokens, commonTokens, PluginContext, Injector, Scope } from '@stryker-mutator/api/plugin';
import { Logger, LoggerFactoryMethod } from '@stryker-mutator/api/logging';
import { Mutant, StrykerOptions } from '@stryker-mutator/api/core';

import ts from 'typescript';

import { TypescriptCompiler } from './typescript-compiler';
import { MemoryFileSystem } from './fs/memory-filesystem';
import { GroupBuilder } from './group-builder';
import { toPosixFileName } from './fs/tsconfig-helpers';

singleTypescriptCheckerLoggerFactory.inject = tokens(commonTokens.getLogger, commonTokens.target);
// eslint-disable-next-line @typescript-eslint/ban-types
function singleTypescriptCheckerLoggerFactory(loggerFactory: LoggerFactoryMethod, target: Function | undefined) {
  const targetName = target?.name ?? SingleTypescriptChecker.name;
  const category = targetName === SingleTypescriptChecker.name ? SingleTypescriptChecker.name : `${SingleTypescriptChecker.name}.${targetName}`;
  return loggerFactory(category);
}

create.inject = tokens(commonTokens.injector);
export function create(injector: Injector<PluginContext>): SingleTypescriptChecker {
  return injector.provideFactory(commonTokens.logger, singleTypescriptCheckerLoggerFactory, Scope.Transient).injectClass(SingleTypescriptChecker);
}

export class SingleTypescriptChecker implements Checker {
  public static inject = tokens(commonTokens.logger, commonTokens.options);
  private readonly compiler: TypescriptCompiler;
  private readonly fs = new MemoryFileSystem();
  private readonly mutantErrors: Record<string, ts.Diagnostic[]> = {};

  constructor(private readonly logger: Logger, private readonly options: StrykerOptions) {
    this.compiler = new TypescriptCompiler(this.fs, options);
  }

  public async init(): Promise<void> {
    return;
  }

  public async initMutants(mutants: Mutant[]): Promise<void> {
    writeFile('errors.txt', '', () => {});

    this.logger.info('Starting initial test run');
    const errors = await this.compiler.check();
    this.logger.info('Initial test run completed');
    if (errors.length) throw new Error('dry run error');

    const startFileName = 'src/index.ts';
    const builder = new GroupBuilder(mutants, startFileName, this.options.tsconfigFile, this.fs);
    const groups = builder.getGroups();

    const mutantsCount = groups.reduce((a, b) => a + b.reduce((c, d) => c + 1, 0), 0);
    this.logger.info(`Testing ${mutantsCount.toString()} mutants in ${groups.length} groups`);

    for (let index = 0; index < groups.length; index++) {
      this.logger.info(`Running group ${index} with ${groups[index].length} mutants of ${groups.length} groups`);
      await this.handleGroup(groups[index]);
    }
  }

  private async handleGroup(group: Mutant[]) {
    group.forEach((mutant) => this.fs.getFile(mutant.fileName)?.mutate(mutant));
    const errors = await this.compiler.check();
    this.logger.info(`Found ${errors.length} errors`);

    errors.forEach((error) => {
      const index = group.findIndex((m) => {
        return toPosixFileName(m.fileName) === toPosixFileName(error.file?.fileName ?? '');
      });
      const mutant = group[index];

      if (!mutant) {
        this.logger.info('Can not match error with mutant');
        const text = `${error.file?.fileName} | ${error.messageText}\n  ${group.map((m) => m.fileName).join('\n  ')}\n\n\n`;

        appendFile('errors.txt', text, () => {
          this.logger.info('Can not match error with mutant');
        });
      } else if (this.mutantErrors[mutant.id]) {
        this.mutantErrors[mutant.id].push(error);
      } else {
        this.mutantErrors[mutant.id] = [error];
      }
    });

    group.forEach((mutant) => this.fs.getFile(mutant.fileName)?.reset());
  }

  public async check(mutant: Mutant): Promise<CheckResult> {
    if (this.mutantErrors[mutant.id]) {
      return {
        status: CheckStatus.CompileError,
        reason: formatErrors(this.mutantErrors[mutant.id]),
      };
    }

    return { status: CheckStatus.Passed };
  }
}

export function formatErrors(errors: readonly ts.Diagnostic[]): string {
  return ts.formatDiagnostics(errors, {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: process.cwd,
    getNewLine: () => EOL,
  });
}
