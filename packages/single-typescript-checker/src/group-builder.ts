import path from 'path';

import { Mutant } from '@stryker-mutator/api/core';
import dependencyTree from 'dependency-tree';

export class GroupBuilder {
  private readonly mutants: Mutant[];
  private readonly baseDir = process.cwd() + '/src';
  private readonly tree: Record<string, { dependencies: string[]; mutants: Mutant[] }>;

  constructor(mutants: Mutant[], startFileName: string, tsconfigFileName: string) {
    this.mutants = mutants;

    const tree = dependencyTree({
      filename: startFileName,
      tsConfig: tsconfigFileName,
      directory: this.baseDir,
    });

    const flattened = this.flatten(tree);
    this.tree = flattened;
  }

  public generateGroups(): Mutant[][] {
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

      console.log(currentNodeGroup.length);
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

  private flatten(tree: dependencyTree.Tree): typeof this.tree {
    const parentNodes = this.getNodeParents(tree, {});
    const allNodeDependencies = this.getAllNodeDependencies(parentNodes);
    const newTree: typeof this.tree = {};

    for (const node in allNodeDependencies) {
      newTree[node] = {
        dependencies: allNodeDependencies[node],
        mutants: this.getMutantsFromNode(node),
      };
    }

    return newTree;
  }

  private getMutantsFromNode(node: string): Mutant[] {
    return this.mutants.filter((mutant) => mutant.fileName === node);
  }

  private getNodeParents(tree: dependencyTree.Tree, allNodes: Record<string, string[]>, parentNode?: string): Record<string, string[]> {
    if (typeof tree === 'string') return { [tree]: [] };

    for (const node in tree) {
      this.getNodeParents(tree[node], allNodes, node);

      if (allNodes[node] && parentNode) {
        allNodes[node].push(parentNode);
      } else {
        allNodes[node] = parentNode ? [parentNode] : [];
      }
    }

    return allNodes;
  }

  private getAllNodeDependencies(parentNodes: Record<string, string[]>): Record<string, string[]> {
    const allNodeDependencies: Record<string, string[]> = {};

    for (const node in parentNodes) {
      allNodeDependencies[node] = [...new Set(this.findDependenciesRecursive(parentNodes[node], parentNodes))];
    }

    return allNodeDependencies;
  }

  private findDependenciesRecursive(dependencies: string[] = [], parentNodes: Record<string, string[]>): string[] {
    let allDependencies = [...dependencies];

    for (const dependency of dependencies) {
      allDependencies = [...allDependencies, ...this.findDependenciesRecursive(parentNodes[dependency], parentNodes)];
    }

    return allDependencies;
  }
}
