import { readFileSync } from 'fs';
import {
  ClassDeclaration,
  createSourceFile,
  EnumDeclaration,
  FunctionDeclaration,
  Identifier,
  InterfaceDeclaration,
  ScriptTarget,
  SyntaxKind,
  TypeAliasDeclaration,
  VariableStatement,
} from 'typescript';
import { buildImportPath, getBasename } from '../builder';
import { BaseUrl } from '../options/baseUrl';
import { Logger } from '../options/logger';
import { SemicolonCharacter } from '../options/noSemicolon';
import { QuoteCharacter } from '../options/quoteCharacter';
import { Directory, Location } from '../utilities';

export function buildFlatBarrel(
  directory: Directory,
  modules: Location[],
  quoteCharacter: QuoteCharacter,
  semicolonCharacter: SemicolonCharacter,
  logger: Logger,
  baseUrl: BaseUrl,
  exportDefault: boolean,
  noWildcards?: boolean
): string {
  return modules.reduce((previous: string, current: Location) => {
    const importPath = buildImportPath(directory, current, baseUrl);
    logger(`Including path ${importPath}`);
    if (exportDefault) {
      const filename = getBasename(current.path);
      previous += `export { default as ${filename} } from ${quoteCharacter}${importPath}${quoteCharacter}${semicolonCharacter}
`;
    }

    if (!!noWildcards) {
      const sourceCode = readFileSync(current.path, 'utf8');
      const sourceFile = createSourceFile(
        current.path,
        sourceCode,
        ScriptTarget.Latest,
        false
      );

      const exportStatements = sourceFile.statements.filter(
        (stmt) =>
          stmt.modifiers &&
          stmt.modifiers.some((mod) => mod.kind === SyntaxKind.ExportKeyword)
      );

      const exports: string[] = exportStatements.reduce(
        (acc, curr) => {
          switch (curr.kind) {
            case SyntaxKind.VariableStatement:
              if ((curr as VariableStatement).declarationList) {
                return (curr as VariableStatement).declarationList.declarations.reduce(
                  (decAcc, decCurr) => {
                    if (
                      decCurr.name &&
                      decCurr.name.kind === SyntaxKind.Identifier
                    ) {
                      return [
                        ...decAcc,
                        (decCurr.name as Identifier).escapedText.toString(),
                      ];
                    }

                    return decAcc;
                  },
                  acc
                );
              }
              break;
            case SyntaxKind.FunctionDeclaration:
            case SyntaxKind.ClassDeclaration:
            case SyntaxKind.InterfaceDeclaration:
            case SyntaxKind.EnumDeclaration:
            case SyntaxKind.TypeAliasDeclaration:
              if (
                (curr as
                  | FunctionDeclaration
                  | ClassDeclaration
                  | InterfaceDeclaration
                  | EnumDeclaration
                  | TypeAliasDeclaration).name
              ) {
                return [
                  ...acc,
                  ((curr as
                    | FunctionDeclaration
                    | ClassDeclaration
                    | InterfaceDeclaration
                    | EnumDeclaration
                    | TypeAliasDeclaration)
                    .name as Identifier).escapedText.toString(),
                ];
              }
              break;
          }

          return acc;
        },
        [] as string[]
      );

      return (previous += `export { ${exports
        .sort()
        .join(
          ', '
        )} } from ${quoteCharacter}${importPath}${quoteCharacter}${semicolonCharacter}
`);
    }

    return (previous += `export * from ${quoteCharacter}${importPath}${quoteCharacter}${semicolonCharacter}
`);
  }, '');
}
