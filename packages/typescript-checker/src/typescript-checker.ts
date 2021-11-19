import { EOL } from 'os';
import path from 'path';

import ts, { InvalidatedProjectKind } from 'typescript';
import { Checker, CheckResult, CheckStatus } from '@stryker-mutator/api/check';
import { tokens, commonTokens, PluginContext, Injector, Scope } from '@stryker-mutator/api/plugin';
import { Logger, LoggerFactoryMethod } from '@stryker-mutator/api/logging';
import { propertyPath } from '@stryker-mutator/util';
import { Mutant, StrykerOptions } from '@stryker-mutator/api/core';

import { HybridFileSystem } from './fs';
import { determineBuildModeEnabled, overrideOptions, retrieveReferencedProjects, guardTSVersion, toPosixFileName } from './tsconfig-helpers';
import * as pluginTokens from './plugin-tokens';

const diagnosticsHost: ts.FormatDiagnosticsHost = {
  getCanonicalFileName: (fileName) => fileName,
  getCurrentDirectory: process.cwd,
  getNewLine: () => EOL,
};


typescriptCheckerLoggerFactory.inject = tokens(commonTokens.getLogger, commonTokens.target);
// eslint-disable-next-line @typescript-eslint/ban-types
function typescriptCheckerLoggerFactory(loggerFactory: LoggerFactoryMethod, target: Function | undefined) {
  const targetName = target?.name ?? TypescriptChecker.name;
  const category = targetName === TypescriptChecker.name ? TypescriptChecker.name : `${TypescriptChecker.name}.${targetName}`;
  return loggerFactory(category);
}

create.inject = tokens(commonTokens.injector);
export function create(injector: Injector<PluginContext>): TypescriptChecker {
  return injector
    .provideFactory(commonTokens.logger, typescriptCheckerLoggerFactory, Scope.Transient)
    .provideClass(pluginTokens.fs, HybridFileSystem)
    .injectClass(TypescriptChecker);
}

/**
 * An in-memory type checker implementation which validates type errors of mutants.
 */
export class TypescriptChecker implements Checker {
  /**
   * Keep track of all tsconfig files which are read during compilation (for project references)
   */
  private readonly allTSConfigFiles: Set<string>;

  public static inject = tokens(commonTokens.logger, commonTokens.options, pluginTokens.fs);
  private readonly tsconfigFile: string;
  private readonly compiler: ts.SolutionBuilder<ts.EmitAndSemanticDiagnosticsBuilderProgram>;

  constructor(private readonly logger: Logger, options: StrykerOptions, private readonly fs: HybridFileSystem) {
    this.tsconfigFile = toPosixFileName(options.tsconfigFile);
    this.allTSConfigFiles = new Set([path.resolve(this.tsconfigFile)]);
    guardTSVersion();
    this.guardTSConfigFileExists();
    const buildModeEnabled = determineBuildModeEnabled(this.tsconfigFile);

    const host = ts.createSolutionBuilderHost({
      ...ts.sys,
      readFile: (fileName) => {
        const content = this.fs.getFile(fileName)?.content;
        if (content && this.allTSConfigFiles.has(path.resolve(fileName))) {
          return this.adjustTSConfigFile(fileName, content, buildModeEnabled);
        }
        return content;
      },
      writeFile: (filePath, data) => {
        this.fs.writeFile(filePath, data);
      },
      createDirectory: () => {
        // Idle, no need to create directories in the hybrid fs
      },
      clearScreen() {
        // idle, never clear the screen
      },
      getModifiedTime: (fileName) => {
        return this.fs.getFile(fileName)!.modifiedTime;
      },
    });

    this.compiler = ts.createSolutionBuilder(host, [this.tsconfigFile], {});
  }

  /**
   * Starts the typescript compiler and does a dry run
   */
  public async init(): Promise<void> {
    this.compiler.build();

    const invalidProject = this.compiler.getNextInvalidatedProject();
    if (invalidProject && invalidProject.kind === InvalidatedProjectKind.Build) {
      const errors = invalidProject.getSemanticDiagnostics();
      if (errors.length) {
        throw new Error(`TypeScript error(s) found in dry run compilation: ${this.formatDiagnostics(errors)}`);
      }
    }
  }

  private guardTSConfigFileExists() {
    if (!ts.sys.fileExists(this.tsconfigFile)) {
      throw new Error(
        `The tsconfig file does not exist at: "${path.resolve(
          this.tsconfigFile
        )}". Please configure the tsconfig file in your stryker.conf file using "${propertyPath<StrykerOptions>('tsconfigFile')}"`
      );
    }
  }

  /**
   * Checks whether or not a mutant results in a compile error.
   * Will simply pass through if the file mutated isn't part of the typescript project
   * @param mutant The mutant to check
   */
  public async check(mutant: Mutant): Promise<CheckResult> {
    if (this.fs.existsInMemory(mutant.fileName)) {
      this.fs.mutate(mutant);

      const invalidProject = this.compiler.getNextInvalidatedProject();
      if (invalidProject && invalidProject.kind === InvalidatedProjectKind.Build) {
        const errors = invalidProject.getSemanticDiagnostics();

        if (errors.length) {
          this.logger.info('got invalid project');

          return {
            status: CheckStatus.CompileError,
            reason: this.formatDiagnostics(invalidProject.getSemanticDiagnostics()),
          };
        }
      }
    }

    // this.logger.info('got good project');
    // We allow people to mutate files that are not included in this ts project
    return {
      status: CheckStatus.Passed,
    };
  }

  /**
   * Post processes the content of a tsconfig file. Adjusts some options for speed and alters quality options.
   * @param fileName The tsconfig file name
   * @param content The tsconfig content
   * @param buildModeEnabled Whether or not `--build` mode is used
   */
  private adjustTSConfigFile(fileName: string, content: string, buildModeEnabled: boolean) {
    const parsedConfig = ts.parseConfigFileTextToJson(fileName, content);
    if (parsedConfig.error) {
      return content; // let the ts compiler deal with this error
    } else {
      for (const referencedProject of retrieveReferencedProjects(parsedConfig, path.dirname(fileName))) {
        this.allTSConfigFiles.add(referencedProject);
      }
      return overrideOptions(parsedConfig, buildModeEnabled);
    }
  }

  private formatDiagnostics(errors: readonly ts.Diagnostic[]) {
    return ts.formatDiagnostics(errors, diagnosticsHost);
  }
}
