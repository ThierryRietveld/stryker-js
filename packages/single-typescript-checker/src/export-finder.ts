import {
  ClassDeclaration,
  ExportedDeclarations,
  FunctionDeclaration,
  MethodDeclaration,
  Project,
  PropertyDeclaration,
  SourceFile,
  TypeAssertion,
} from 'ts-morph';

export class ExportFinder {
  private readonly project = new Project({ useInMemoryFileSystem: true });
  private readonly file1: SourceFile;
  private readonly file2: SourceFile;

  constructor() {
    this.file1 = this.project.createSourceFile('file1.ts', '');
    this.file2 = this.project.createSourceFile('file2.ts', '');
  }

  public same(file1: string, file2: string): boolean {
    this.file1.replaceWithText(file1);
    this.file2.replaceWithText(file2);

    const exports1 = this.getReturnTypes(this.file1);
    const exports2 = this.getReturnTypes(this.file2);

    try {
      const j1 = JSON.stringify(exports1);
      const j2 = JSON.stringify(exports2).replace(new RegExp('file2', 'g'), 'file1');
      console.log();
      console.log(j1);
      console.log(j2);
      return j1 === j2;
    } catch (err) {
      console.log('error: ', err);
      return false;
    }
  }

  private getReturnTypes(sourceFile: SourceFile): any {
    let t = {};
    for (const [name, declarations] of sourceFile.getExportedDeclarations()) {
      t = { ...t, [name]: declarations.map(this.handleDeclaration.bind(this)) };
    }

    return t;
  }

  private handleDeclaration(declaration: ExportedDeclarations): any {
    // ClassDeclaration | InterfaceDeclaration | EnumDeclaration | FunctionDeclaration | VariableDeclaration | TypeAliasDeclaration | ModuleDeclaration | Expression | SourceFile
    if (TypeAssertion.isFunctionDeclaration(declaration)) {
      return { [declaration.getName() ?? '']: this.getReturnTypesFromFunction(declaration) };
    } else if (TypeAssertion.isClassDeclaration(declaration)) {
      return { [declaration.getName() ?? '']: this.getReturnTypesFromClass(declaration) };
    } else if (TypeAssertion.isVariableDeclaration(declaration)) {
      return { [declaration.getName()]: declaration.getType().getText() };
    } else {
      console.log(`Dont know type ${declaration.getType().getText()}`);
      return {};
    }
  }

  private getReturnTypesFromClass(c: ClassDeclaration): any {
    return {
      methods: c.getMethods().map(this.getReturnTypesFromMethod.bind(this)),
      properties: c.getProperties().map(this.getReturnTypesFromProperty.bind(this)),
    };
  }

  private getReturnTypesFromMethod(m: MethodDeclaration): any {
    return { [m.getName() ?? '']: m.getReturnType().getText() };
  }

  private getReturnTypesFromProperty(p: PropertyDeclaration): any {
    return { [p.getName() ?? '']: p.getType().getText() };
  }

  private getReturnTypesFromFunction(f: FunctionDeclaration): any {
    return { [f.getName() ?? '']: f.getReturnType().getText() };
  }
}
