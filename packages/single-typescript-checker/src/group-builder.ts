import path from 'path';

import { Mutant } from '@stryker-mutator/api/core';

// @ts-expect-error
import precinct from 'precinct';

import { toPosixFileName } from './fs/tsconfig-helpers';

import { MemoryFileSystem } from './fs/memory-filesystem';

export class GroupBuilder {
  private readonly tree: Record<string, { dependencies: string[]; mutants: Mutant[] }> = {};
  private readonly filesSeen: string[] = [];

  constructor(private readonly mutants: Mutant[], startFileName: string, tsconfigFileName: string, private readonly fs: MemoryFileSystem) {
    this.createTree();
  }

  private createTree(): typeof this.tree {
    const tree: typeof this.tree = {};

    this.mutants.forEach((mutant) => {
      this.getDependenciesRecursive(mutant.fileName);
      this.tree[mutant.fileName].mutants.push(mutant);
    });

    return tree;
  }

  // missing recursive stop && dont double check mutant files
  private getDependenciesRecursive(fileName: string) {
    if (!this.tree[fileName]) this.tree[fileName] = { mutants: [], dependencies: [] };
    if (this.filesSeen.includes(fileName)) return;
    this.filesSeen.push(fileName);

    try {
      const dependencies = this.getDependencies(fileName);
      dependencies.forEach((d) => {
        this.addDependency(d, fileName);
        this.getDependenciesRecursive(d);
      });
    } catch (e) {
      console.log(fileName);
    }
  }

  // todo fix that every type can be used
  private getDependencies(fileName: string): string[] {
    const content = this.fs.getFile(fileName)?.content;
    if (!content) return [];
    const dependencies: string[] = precinct(content, { type: 'ts' });
    return dependencies.filter((dependency: string) => dependency.startsWith('.')).map((d) => path.resolve(path.dirname(fileName), d + '.ts'));
  }

  private addDependency(dependency: string, dependsOn: string) {
    if (this.tree[dependency]) {
      if (this.tree[dependency].dependencies.includes(dependsOn)) return;
      this.tree[dependency].dependencies.push(dependsOn);
    } else {
      this.tree[dependency] = {
        dependencies: [dependsOn],
        mutants: [],
      };
    }
  }

  public getGroups(): Mutant[][] {
    const mutantsNotIncludedInTree: Mutant[][] = [];

    this.mutants.forEach((m) => {
      const include = Object.keys(this.tree).findIndex((e) => toPosixFileName(e) === toPosixFileName(m.fileName));
      if (include === -1) mutantsNotIncludedInTree.push([m]);
    });
    console.log(`Could not find ${mutantsNotIncludedInTree.length} mutants in tree of ${this.mutants.length} mutants`);

    return [...this.generateGroups(), ...mutantsNotIncludedInTree];
  }

  private generateGroups(): Mutant[][] {
    const mutantGroups: Mutant[][] = [];
    const usedNodes: string[] = [];
    for (const activeNode in this.tree) {
      if (!this.shouldUseNode(activeNode, usedNodes)) continue;
      usedNodes.push(activeNode);

      const currentMutantGroup = this.tree[activeNode].mutants.splice(0, 1);
      const currentNodeGroup = [activeNode];
      let ignoreNodes = this.tree[activeNode].dependencies;

      for (const searchNode in this.tree) {
        if (searchNode === activeNode || !this.shouldUseNode(searchNode, usedNodes)) continue;

        if (this.allowedInGroup(ignoreNodes, currentNodeGroup, searchNode)) {
          usedNodes.push(searchNode);
          currentMutantGroup.push(this.tree[searchNode].mutants.splice(0, 1)[0]);
          currentNodeGroup.push(searchNode);

          ignoreNodes = [...ignoreNodes, ...this.tree[searchNode].dependencies];
        }
      }

      mutantGroups.push(currentMutantGroup);
    }

    if (mutantGroups.length) {
      return [...mutantGroups, ...this.generateGroups()];
    }

    return mutantGroups;
  }

  private shouldUseNode(node: string, usedNodes: string[]): boolean {
    if (usedNodes.includes(node)) false;
    return this.tree[node].mutants.length > 0;
  }

  private allowedInGroup(ignoreNodes: string[], currentNodeGroup: string[], searchNode: string): boolean {
    if (ignoreNodes.includes(searchNode)) return false;

    for (const groupNode of this.tree[searchNode].dependencies) {
      if (currentNodeGroup.includes(groupNode)) return false;
    }

    return true;
  }
}
