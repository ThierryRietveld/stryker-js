import ts from 'typescript';

import { File } from './memory-file';
import { toPosixFileName } from './tsconfig-helpers';

export class MemoryFileSystem {
  private files: Record<string, File> = {};

  public getFile(fileName: string): File {
    if (this.files[fileName]) {
      return this.files[fileName];
    }

    return this.getNewFile(fileName);
  }

  private getNewFile(fileName: string): File {
    const content = ts.sys.readFile(fileName);
    const file = new File(fileName, content ?? '');
    this.files[fileName] = file;
    return file;
  }

  public writeFile(fileName: string, content: string): File {
    fileName = fileName.replace(/\\/g, '/');
    const file = new File(fileName, content);
    this.files[fileName] = file;
    return file;
  }

  public readDirectory(
    path: string,
    extensions?: readonly string[],
    exclude?: readonly string[],
    include?: readonly string[],
    depth?: number
  ): string[] {
    const content = ts.sys.readDirectory(path, extensions, exclude, include, depth);
    path = toPosixFileName(path);

    Object.keys(this.files).forEach((fileName) => {
      const posFileName = toPosixFileName(fileName);
      // misschien een apart object bijhouden voor mutated files voor performance
      if (this.files[fileName].mutated && RegExp(path).exec(posFileName)) {
        content.push(fileName);
      }
    });

    return content;
  }
}
