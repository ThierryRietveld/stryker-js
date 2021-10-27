import { EOL } from 'os';

import { Checker, CheckResult, CheckStatus } from '@stryker-mutator/api/check';
import { tokens, commonTokens, PluginContext, Injector, Scope } from '@stryker-mutator/api/plugin';
import { Logger, LoggerFactoryMethod } from '@stryker-mutator/api/logging';
import { Mutant, StrykerOptions } from '@stryker-mutator/api/core';
import { Task } from '@stryker-mutator/util';

import ts from 'typescript';

import { TypescriptCompiler } from './typescript-compiler';
import { MemoryFileSystem } from './fs/memory-filesystem';
import { ExportFinder } from './export-finder';
import { AllAtOnceCheckValid } from './check-validator';

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
  private readonly exportFinder = new ExportFinder();
  private mutants: Mutant[] = [];

  constructor(private readonly logger: Logger, options: StrykerOptions) {
    this.compiler = new TypescriptCompiler(this.fs, options);
  }

  public async init(): Promise<void> {
    return;
  }

  public async initMutants(mutants: Mutant[]): Promise<void> {
    const dryRunErrors = await this.compiler.check();
    if (dryRunErrors.length > 0) throw new Error(`TypeScript error(s) found in dry run compilation: ${formatErrors(dryRunErrors)}`);

    this.mutants = mutants;
    this.logger.info(`Init ${mutants.length} mutants`);
    const errors = await this.allMutantsAtOnce(mutants);
    this.logger.info('handleErrors');
    this.handleErrors(errors);

    this.mutants.forEach((mutant) => {
      const validErrors = AllAtOnceCheckValid(this.mutantErrors[mutant.id] ?? []);
      if (validErrors.length) this.mutantErrors[mutant.id] = validErrors;
      else delete this.mutantErrors[mutant.id];
    });

    this.logger.info(`Found ${Object.keys(this.mutantErrors).length} compile errors`);
  }

  private async allMutantsAtOnce(mutants: Mutant[]): Promise<readonly ts.Diagnostic[]> {
    mutants.forEach((mutant) => {
      try {
        const originalFile = this.fs.getFile(mutant.fileName);
        const mutatedFileName = this.getMutantMutatedFileName(mutant);
        const mutatedFile = this.fs.writeFile(mutatedFileName, originalFile?.content ?? '');
        mutatedFile.mutate(mutant);
        console.log(mutant.id);
      } catch (e) {
        this.logger.info(`Deleting file ${this.getMutantMutatedFileName(mutant)}`);
        this.fs.deleteFile(this.getMutantMutatedFileName(mutant));
      }
    });

    const errors = await this.compiler.check();
    const allErrors = this.handle2488Errors(errors);
    return allErrors;
  }

  private async handle2488Errors(errors: readonly ts.Diagnostic[]): Promise<readonly ts.Diagnostic[]> {
    let rerun = false;

    errors.forEach((e) => {
      if (e.code === 2488) {
        rerun = true;
      }

      if (e.file) {
        this.fs.deleteFile(e.file?.fileName);
      }
    });

    if (rerun) {
      this.logger.info('Rerunning compiler for 2488 error');
      const newErrors = await this.compiler.check();
      return [...errors, ...(await this.handle2488Errors(newErrors))];
    } else {
      return errors;
    }
  }

  public async check(mutant: Mutant): Promise<CheckResult> {
    if (this.mutantErrors[mutant.id]?.length) {
      return {
        status: CheckStatus.CompileError,
        reason: formatErrors(this.mutantErrors[mutant.id]),
      };
    }

    return { status: CheckStatus.Passed };
  }

  private handleErrors(errors: readonly ts.Diagnostic[]) {
    errors.forEach((e) => {
      const mutant = this.getMutantFromMutatedFileName(e.file?.fileName ?? '');

      if (!mutant) this.logger.info(`Could not bind ${formatErrors([e])} to a mutant`);
      else if (!this.mutantErrors[mutant.id]) this.mutantErrors[mutant.id] = [e];
      else this.mutantErrors[mutant.id].push(e);
    });
  }

  private clean() {
    this.mutants.forEach((m) => {
      this.fs.deleteFile(this.getMutantMutatedFileName(m));
    });
  }

  // private async testNaive(mutant: Mutant) {
  //   this.logger.info(`Testing ${mutant.id} naive`);
  //   const file = this.fs.getFile(mutant.fileName);
  //   const original = file?.content;
  //   file?.mutate(mutant);

  //   const errors = await this.compiler.check();

  //   if (errors.length) {
  //     this.mutantPromises[mutant.id].resolve({
  //       status: CheckStatus.CompileError,
  //       reason: formatErrors(errors),
  //     });
  //   } else {
  //     this.mutantPromises[mutant.id].resolve({
  //       status: CheckStatus.Passed,
  //     });
  //   }

  //   file?.write(original ?? '');
  // }

  // private testSeparate(mutant: Mutant) {
  //   this.logger.info(`Test separate ${mutant.id}`);

  //   const file = this.fs.getFile(mutant.fileName);
  //   const original = file?.content;
  //   file?.mutate(mutant);
  //   const errors = this.compiler.check();
  //   file?.write(original ?? '');
  //   return errors;
  //   // this.handleErrors(errors);
  // }

  // private getDifferentExport(allMutants: Mutant[]): Mutant[] {
  //   this.logger.info('Searching different exports');

  //   const exportDifferences = allMutants.filter((mutant) => {
  //     if (this.mutantHasError(mutant)) return false;
  //     return !this.exportFinder.same(
  //       this.fs.getFile(mutant.fileName)?.content ?? '',
  //       this.fs.getFile(this.getMutantMutatedFileName(mutant))?.content ?? ''
  //     );
  //   });

  //   this.logger.info(`Found ${exportDifferences.length} from ${allMutants.length} mutants with export differences`);
  //   return exportDifferences;
  // }

  private mutantHasError(mutant: Mutant): boolean {
    return !!this.mutantErrors[mutant.id];
  }

  private getMutantMutatedFileName(mutant: Mutant) {
    return mutant.fileName.replace('.ts', `-mutated(${mutant.id}).ts`);
  }

  // private findMutantFromFile(sourceFile: ts.SourceFile | undefined): Mutant | null {
  //   if (!sourceFile) return null;

  //   const file = this.fs.getFile(sourceFile.fileName);
  //   return file.mutant ?? null;
  // }

  private getMutantFromMutatedFileName(fileName: string): Mutant | null {
    const myRegexp = new RegExp(/-mutated\((\d*)\)\.ts/, 'g');
    const match = myRegexp.exec(fileName);

    console.log(fileName, match);
    if (match) {
      return this.mutants[+match[1]];
    }

    return null;
  }
}

export function formatErrors(errors: readonly ts.Diagnostic[]): string {
  return ts.formatDiagnostics(errors, {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: process.cwd,
    getNewLine: () => EOL,
  });
}
