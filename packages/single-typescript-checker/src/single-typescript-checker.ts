import { EOL } from 'os';


import { Checker, CheckResult, CheckStatus } from '@stryker-mutator/api/check';
import { tokens, commonTokens, PluginContext, Injector, Scope } from '@stryker-mutator/api/plugin';
import { Logger, LoggerFactoryMethod } from '@stryker-mutator/api/logging';
import { Mutant, StrykerOptions } from '@stryker-mutator/api/core';

import ts from 'typescript';

import { TypescriptCompiler } from './typescript-compiler';
import { MemoryFileSystem } from './memory-filesystem';

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

  constructor(private readonly logger: Logger, options: StrykerOptions) {
    this.compiler = new TypescriptCompiler(this.fs, logger, options);
  }

  public async init(): Promise<void> {
    // isn't needed because we can find dry run errors beside the mutants

    // const errors = await this.compiler.init();
    // this.logger.info(`got ${errors.length} from init`);
    // if (errors.length) {
    //   throw new Error(`TypeScript error(s) found in dry run compilation: ${this.formatErrors(errors)}`);
    // }
  }

  public async initMutants(mutants: Mutant[]): Promise<void> {
    this.logger.info('init mutants');

    mutants.reverse().forEach((mutant) => {
      if (!['77', '78'].includes(mutant.id)) return;
      const originalFile = this.fs.getFile(mutant.fileName);
      const mutatedFileName = mutant.fileName.replace('.ts', `-mutated(${mutant.id}).ts`);
      const mutatedFile = this.fs.writeFile(mutatedFileName, originalFile.content);
      mutatedFile.mutate(mutant);
    });

    const errors = await this.compiler.init();
    this.handleErrors(errors);
  }

  private handleErrors(errors: ts.Diagnostic[]): void {
    errors.forEach((error) => {
      if (!error.file) return;

      const regex = /mutated\((\d*)\).ts$/;
      const match = regex.exec(error.file.fileName);

      if (match) {
        const id = match[1];

        if (!this.mutantErrors[id]) {
          this.mutantErrors[id] = [];
        }

        this.mutantErrors[id].push(error);
      } else {
        throw new Error('Dry run error');
      }
    });
  }

  public async check(mutant: Mutant): Promise<CheckResult> {
    if (this.mutantErrors[mutant.id]) {
      return {
        status: CheckStatus.CompileError,
        reason: this.formatErrors(this.mutantErrors[mutant.id]),
      };
    }

    return {
      status: CheckStatus.Passed,
    };
  }

  private formatErrors(errors: ts.Diagnostic[]) {
    return ts.formatDiagnostics(errors, {
      getCanonicalFileName: (fileName) => fileName,
      getCurrentDirectory: process.cwd,
      getNewLine: () => EOL,
    });
  }
}
