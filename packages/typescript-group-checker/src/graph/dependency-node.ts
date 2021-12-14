export class DependencyNode {
  public imports: DependencyNode[] = [];
  public dependencies: DependencyNode[] = [];

  constructor(public readonly fileName: string) { }

  public getAllDependencies(nodesSeen: DependencyNode[] = []): DependencyNode[] {
    if (nodesSeen.includes(this)) return [];
    nodesSeen.push(this);

    let dependencies: DependencyNode[] = [...this.dependencies];

    this.dependencies.forEach((d) => {
      dependencies = [...dependencies, ...d.getAllDependencies(nodesSeen)];
    });

    return dependencies;
  }

  public getAllImports(nodesSeen: DependencyNode[] = []): DependencyNode[] {
    if (nodesSeen.includes(this)) return [];
    nodesSeen.push(this);

    let imports: DependencyNode[] = [...this.imports];

    this.imports.forEach((i) => {
      imports = [...imports, ...i.getAllImports(nodesSeen)];
    });

    return imports;
  }
}