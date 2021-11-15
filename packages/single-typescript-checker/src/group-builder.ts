import path from 'path';

import { existsSync, mkdirSync, unlinkSync } from 'fs';

import { EOL } from 'os';

import { Mutant } from '@stryker-mutator/api/core';

// @ts-expect-error
import precinct from 'precinct';

import graphviz from 'graphviz';

import { ts } from '@ts-morph/common';

import { toPosixFileName } from './fs/tsconfig-helpers';

import { MemoryFileSystem } from './fs/memory-filesystem';

export class GroupBuilder {
  private readonly tree: Record<string, { dependencies: string[]; imports: string[]; mutants: Mutant[] }> = {};
  private readonly filesSeen: string[] = [];

  constructor(private readonly mutants: Mutant[], private readonly fs: MemoryFileSystem) {
    this.createTree();
    this.generateImage('base');
  }

  private createTree() {
    this.mutants.forEach((mutant) => {
      this.getDependenciesRecursive(mutant.fileName);
      this.tree[mutant.fileName].mutants.push(mutant);
    });
  }

  public matchErrorWithGroup(errorFileName: string, group: Mutant[], nodeSeen: string[] = []): Mutant[] {
    this.getDependenciesRecursive(errorFileName);
    let mutantsHit: Mutant[] = [];

    this.tree[errorFileName].imports.forEach((node) => {
      if (nodeSeen.includes(node)) return;
      nodeSeen.push(node);
      const index = group.findIndex((m) => m.fileName === node);
      if (index >= 0) mutantsHit.push(group[index]);
      mutantsHit = [...mutantsHit, ...this.matchErrorWithGroup(node, group, nodeSeen)];
    });

    return mutantsHit;
  }

  private getDependenciesRecursive(fileName: string) {
    if (this.filesSeen.includes(fileName)) return;

    const imports = this.getDependencies(fileName);
    if (!this.tree[fileName]) this.tree[fileName] = { imports: imports, mutants: [], dependencies: [] };
    this.filesSeen.push(fileName);

    try {
      imports.forEach((d) => {
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
      const imports = this.getDependencies(dependency);

      this.tree[dependency] = {
        dependencies: [dependsOn],
        imports: imports,
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
      let ignoreNodes = this.getAllDependencies(activeNode);

      for (const searchNode in this.tree) {
        if (searchNode === activeNode || !this.shouldUseNode(searchNode, usedNodes)) continue;

        if (this.allowedInGroup(ignoreNodes, currentNodeGroup, searchNode)) {
          usedNodes.push(searchNode);
          currentMutantGroup.push(this.tree[searchNode].mutants.splice(0, 1)[0]);
          currentNodeGroup.push(searchNode);

          ignoreNodes = [...ignoreNodes, ...this.getAllDependencies(searchNode)];
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

    for (const groupNode of this.getAllDependencies(searchNode)) {
      if (currentNodeGroup.includes(groupNode)) return false;
    }

    return true;
  }

  private getAllDependencies(node: string, seenNodes: string[] = []): string[] {
    let nodes = [...this.tree[node].dependencies];

    this.tree[node].dependencies.forEach((n) => {
      if (seenNodes.includes(n)) return;
      seenNodes.push(n);
      nodes = [...nodes, ...this.getAllDependencies(n, seenNodes)];
    });

    return nodes;
  }

  public generateImage(
    imageName: string,
    mutatedNode: Mutant[] = [],
    errorNodes: readonly ts.Diagnostic[] = [],
    unMatchedErrors: readonly ts.Diagnostic[] = []
  ): void {
    const treeGraphviz = graphviz.digraph('G');

    const getName = (filename: string) => {
      return toPosixFileName(filename).split(toPosixFileName(process.cwd())).pop() ?? '';
    };

    for (const node in this.tree) {
      const n = treeGraphviz.addNode(getName(node), {
        color: 'whitesmoke',
        style: 'filled,bold',
        shape: 'rect',
        fontname: 'Arial',
        nodesep: '5',
        fillcolor: 'whitesmoke',
      });

      const errors = errorNodes.filter((e) => getName(node) === getName(e.file?.fileName ?? ''));
      if (errors.length) {
        n.set('color', 'orange');
        n.set('fillcolor', 'orange');
        n.set('tooltip', ts.formatDiagnostics(errors, diagnosticsHost));
      }

      const mutant = mutatedNode.find((m) => getName(m.fileName) === getName(node));
      if (mutant) {
        n.set('fillcolor', 'cyan');
        n.set('label', `${getName(mutant.fileName)} (${mutant.id})`);
      }

      const unmatchedErrors = unMatchedErrors.filter((e) => getName(node) === getName(e.file?.fileName ?? ''));
      if (unmatchedErrors.length) {
        n.set('fillcolor', 'red');
        n.set('tooltip', ts.formatDiagnostics(errors, diagnosticsHost));
      }
    }

    for (const node in this.tree) {
      this.tree[node].dependencies.forEach((n) => {
        treeGraphviz.addEdge(getName(n), getName(node), { color: 'black' });
      });
    }

    if (!existsSync(`${process.cwd()}/graphs/`)) mkdirSync(`${process.cwd()}/graphs/`);
    const imagePath = `${process.cwd()}/graphs/${imageName}.svg`;

    try {
      if (existsSync(imagePath)) unlinkSync(imagePath);
      treeGraphviz.output('svg', imagePath);
    } catch (e) {
      console.log(e);
    }
  }
}

const diagnosticsHost: ts.FormatDiagnosticsHost = {
  getCanonicalFileName: (fileName) => fileName,
  getCurrentDirectory: process.cwd,
  getNewLine: () => EOL,
};
