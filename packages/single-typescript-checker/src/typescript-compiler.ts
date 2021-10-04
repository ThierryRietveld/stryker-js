import path from 'path';

import { Mutant, StrykerOptions } from '@stryker-mutator/api/core';

import ts from 'typescript';
import { Task } from '@stryker-mutator/util';

import { Logger } from '@stryker-mutator/api/logging';

import { MemoryFileSystem } from './memory-filesystem';
import { determineBuildModeEnabled, overrideOptions, retrieveReferencedProjects, toPosixFileName } from './tsconfig-helpers';

const FILE_CHANGE_DETECTED_DIAGNOSTIC_CODE = 6032;

export class TypescriptCompiler {
  /**
   * Keep track of all tsconfig files which are read during compilation (for project references)
   */
  private readonly allTSConfigFiles: Set<string>;
  private readonly tsconfigFile: string;

  private readonly currentErrors: ts.Diagnostic[] = [];

  private readonly currentTask = new Task<ts.Diagnostic[]>();

  constructor(private readonly fs: MemoryFileSystem, private readonly logger: Logger, options: StrykerOptions) {
    this.tsconfigFile = toPosixFileName(options.tsconfigFile);
    this.allTSConfigFiles = new Set([path.resolve(this.tsconfigFile)]);
  }

  public async init(): Promise<ts.Diagnostic[]> {
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
          watchFile: (filePath: string, callback: ts.FileWatcherCallback) => {
            return {
              close: () => {
                // delete this.fs.getFile(filePath)!.watcher;
              },
            };
          },
          writeFile: (filePath, data) => {
            // this.fs.writeFile(filePath, data);
          },
          createDirectory: () => {
            // Idle, no need to create directories in the hybrid fs
          },
          clearScreen() {
            // idle, never clear the screen
          },
          watchDirectory: (pathName: string, callback: ts.DirectoryWatcherCallback): ts.FileWatcher => {
            // this is used to see if new files are added to a directory. Can safely be ignored for mutation testing.

            return {
              // eslint-disable-next-line @typescript-eslint/no-empty-function
              close() { },
            };
          },
        },
        undefined,
        (error) => {
          this.currentErrors.push(error);
        },
        (status) => {
          console.log('status');
        },
        (summary) => {
          console.log('done, summary');
          summary.code !== FILE_CHANGE_DETECTED_DIAGNOSTIC_CODE && this.resolveCheckResult();
        }
      ),
      [this.tsconfigFile],
      {}
    );
    compiler.build();
    return this.currentTask.promise;
  }

  // public check(directoryUpdates: Set<string>): Promise<ts.Diagnostic[]> {
  //   if (!this.directoryUpdate) {
  //     throw new Error('missing directory update');
  //   }

  //   this.currentErrors = [];
  //   this.currentTask = new Task();
  //   // directoryUpdates.forEach((dir) => this.directoryUpdate?.(dir.replace(/\\/g, '/')));
  //   this.directoryUpdate('C:/Users/DannyBe/Documents/dev/stryker-js/packages/core/src');
  //   return this.currentTask.promise;
  // }

  /**
   * Resolves the task that is currently running. Will report back the check result.
   */
  private resolveCheckResult(): void {
    this.currentTask.resolve(this.currentErrors);
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
}
