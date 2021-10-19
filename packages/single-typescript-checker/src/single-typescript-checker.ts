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
    this.compiler = new TypescriptCompiler(this.fs, options);
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
    this.logger.info(`Init ${mutants.length} mutants`);

    mutants.forEach((mutant) => {
      const originalFile = this.fs.getFile(mutant.fileName);
      const mutatedFileName = this.getMutantMutatedFileName(mutant);
      const mutatedFile = this.fs.writeFile(mutatedFileName, originalFile.content);
      mutatedFile.mutate(mutant);
    });

    const errors = this.compiler.check();
    this.handleErrors(errors);
    this.handle2488Error(errors, mutants);

    this.logger.info(`Found ${Object.keys(this.mutantErrors).length} compile errors`);
  }

  private handle2488Error(errors: readonly ts.Diagnostic[], allMutants: Mutant[]): void {
    const changed = errors.some((e) => e.code === 2488);

    if (changed) {
      allMutants.forEach((mutant) => {
        const name = this.getMutantMutatedFileName(mutant);
        if (this.mutantHasError(mutant)) {
          this.fs.deleteFile(name);
        }
      });

      const newErrors = this.compiler.check();
      this.handleErrors(newErrors);
      this.handle2488Error(newErrors, allMutants);
    }
  }

  private handleErrors(errors: readonly ts.Diagnostic[]): void {
    errors.forEach((error) => {
      const mutant = this.findMutantFromFile(error.file);

      if (mutant) {
        if (!this.mutantErrors[mutant.id]) {
          this.mutantErrors[mutant.id] = [];
        }

        this.mutantErrors[mutant.id].push(error);
      } else {
        // throw new Error('Dry run error');
      }
    });
  }

  private mutantHasError(mutant: Mutant): boolean {
    return !!this.mutantErrors[mutant.id];
  }

  private getMutantMutatedFileName(mutant: Mutant) {
    return mutant.fileName.replace('.ts', `-mutated(${mutant.id}).ts`);
  }

  private findMutantFromFile(sourceFile: ts.SourceFile | undefined): Mutant | null {
    if (!sourceFile) return null;

    const file = this.fs.getFile(sourceFile.fileName);
    return file.mutant ?? null;
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
