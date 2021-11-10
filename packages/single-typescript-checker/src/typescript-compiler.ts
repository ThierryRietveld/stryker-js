import path from 'path';

import { StrykerOptions } from '@stryker-mutator/api/core';
import { Task } from '@stryker-mutator/util';

import ts from 'typescript';

import { MemoryFileSystem } from './fs/memory-filesystem';
import { determineBuildModeEnabled, overrideOptions, retrieveReferencedProjects, toPosixFileName } from './fs/tsconfig-helpers';

export class TypescriptCompiler {
  /**
   * Keep track of all tsconfig files which are read during compilation (for project references)
   */
  private readonly allTSConfigFiles: Set<string>;
  private readonly tsconfigFile: string;
  private currentTask = new Task();
  private currentErrors: ts.Diagnostic[] = [];

  constructor(private readonly fs: MemoryFileSystem, private readonly options: StrykerOptions) {
    this.tsconfigFile = toPosixFileName(this.options.tsconfigFile);
    this.allTSConfigFiles = new Set([path.resolve(this.tsconfigFile)]);
    const buildModeEnabled = determineBuildModeEnabled(this.tsconfigFile);

    const compiler = ts.createSolutionBuilderWithWatch(
      ts.createSolutionBuilderWithWatchHost(
        {
          ...ts.sys,
          readFile: (fileName) => {
            const content = this.fs.getFile(fileName)?.content;
            if (content && this.allTSConfigFiles.has(path.resolve(fileName))) {
              return this.adjustTSConfigFile(fileName, content, buildModeEnabled);
            }
            return content;
          },
          readDirectory: this.fs.readDirectory.bind(this.fs),
          getModifiedTime: (pathName: string) => {
            return this.fs.getFile(pathName)?.modifiedTime;
          },
          watchFile: (filePath: string, callback: ts.FileWatcherCallback) => {
            const file = this.fs.getFile(filePath);
            if (file) {
              file.watcher = callback;
            }

            return {
              close: () => {
                delete this.fs.getFile(filePath)!.watcher;
              },
            };
          },
          writeFile: (fileName) => { },
        },
        undefined,
        (error) => {
          this.currentErrors.push(error);
        },
        (status) => { },
        (summary) => {
          this.currentTask.resolve();
        }
      ),
      [this.tsconfigFile],
      {}
    );

    compiler.build();
  }

  public async check(): Promise<readonly ts.Diagnostic[]> {
    await this.currentTask.promise;
    const errors = [...this.currentErrors];
    this.currentTask = new Task();
    this.currentErrors = [];
    return errors;
  }

  // constructor(private readonly fs: MemoryFileSystem, private readonly options: StrykerOptions) {
  //   this.tsconfigFile = toPosixFileName(this.options.tsconfigFile);
  //   this.allTSConfigFiles = new Set([path.resolve(this.tsconfigFile)]);
  //   const buildModeEnabled = determineBuildModeEnabled(this.tsconfigFile);

  //   this.host = ts.createSolutionBuilderHost({
  //     ...ts.sys,
  //     readFile: (fileName) => {
  //       const content = this.fs.getFile(fileName)?.content;

  //       if (content && this.allTSConfigFiles.has(path.resolve(fileName))) {
  //         return this.adjustTSConfigFile(fileName, content, buildModeEnabled);
  //       }

  //       return content;
  //     },
  //     readDirectory: this.fs.readDirectory.bind(this.fs),
  //   });

  //   console.log(this.tsconfigFile);
  //   this.compiler = ts.createSolutionBuilder(this.host, [this.tsconfigFile], { incremental: false });
  // }

  // public async check(): Promise<readonly ts.Diagnostic[]> {
  //   // const compiler = ts.createSolutionBuilder(this.host, [this.tsconfigFile], {});
  //   // this.compiler = ts.createSolutionBuilder(this.host, [this.tsconfigFile], {});

  //   const a = this.compiler.getNextInvalidatedProject();
  //   if (a?.kind === ts.InvalidatedProjectKind.Build) {
  //     return a.getSemanticDiagnostics();
  //   }

  //   return [];
  // }

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
}
