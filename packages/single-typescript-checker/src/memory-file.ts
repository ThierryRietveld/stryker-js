import { Mutant, Position } from '@stryker-mutator/api/core';
import ts from 'typescript';

export class File {
  private sourceFile: ts.SourceFile | undefined;
  public mutated = false;

  constructor(private readonly fileName: string, public content: string) {}

  public write(data: string): void {
    this.content = data;
  }

  public mutate(mutant: Pick<Mutant, 'location' | 'replacement'>): void {
    this.mutated = true;
    const start = this.getOffset(mutant.location.start);
    const end = this.getOffset(mutant.location.end);
    const original = this.content;
    this.content = `${original.substr(0, start)}${mutant.replacement}${original.substr(end)}`;
  }

  private getOffset(pos: Position): number {
    if (!this.sourceFile) {
      this.sourceFile = ts.createSourceFile(this.fileName, this.content, ts.ScriptTarget.Latest, false, undefined);
    }
    return this.sourceFile.getPositionOfLineAndCharacter(pos.line, pos.column);
  }
}
