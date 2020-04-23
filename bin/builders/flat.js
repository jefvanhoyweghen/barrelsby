"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const typescript_1 = require("typescript");
const builder_1 = require("../builder");
function buildFlatBarrel(directory, modules, quoteCharacter, semicolonCharacter, logger, baseUrl, exportDefault) {
    return modules.reduce((previous, current) => {
        const importPath = builder_1.buildImportPath(directory, current, baseUrl);
        logger(`Including path ${importPath}`);
        if (exportDefault) {
            const filename = builder_1.getBasename(current.path);
            previous += `export { default as ${filename} } from ${quoteCharacter}${importPath}${quoteCharacter}${semicolonCharacter}
`;
        }
        const sourceCode = fs_1.readFileSync(current.path, 'utf8');
        const sourceFile = typescript_1.createSourceFile(current.path, sourceCode, typescript_1.ScriptTarget.Latest, false);
        console.log(current.path);
        const exportStatements = sourceFile.statements.filter((stmt) => stmt.modifiers &&
            stmt.modifiers.some((mod) => mod.kind === typescript_1.SyntaxKind.ExportKeyword));
        const exports = exportStatements.reduce((acc, curr) => {
            switch (curr.kind) {
                case typescript_1.SyntaxKind.VariableStatement:
                    if (curr.declarationList) {
                        return curr.declarationList.declarations.reduce((decAcc, decCurr) => {
                            if (decCurr.name &&
                                decCurr.name.kind === typescript_1.SyntaxKind.Identifier) {
                                return [
                                    ...decAcc,
                                    decCurr.name.escapedText.toString(),
                                ];
                            }
                            return decAcc;
                        }, acc);
                    }
                    break;
                case typescript_1.SyntaxKind.FunctionDeclaration:
                case typescript_1.SyntaxKind.ClassDeclaration:
                case typescript_1.SyntaxKind.InterfaceDeclaration:
                case typescript_1.SyntaxKind.EnumDeclaration:
                case typescript_1.SyntaxKind.TypeAliasDeclaration:
                    if (curr.name) {
                        return [
                            ...acc,
                            curr
                                .name.escapedText.toString(),
                        ];
                    }
                    break;
            }
            return acc;
        }, []);
        return (previous += `export { ${exports
            .sort()
            .join(', ')} } from ${quoteCharacter}${importPath}${quoteCharacter}${semicolonCharacter}
`);
    }, '');
}
exports.buildFlatBarrel = buildFlatBarrel;
//# sourceMappingURL=flat.js.map