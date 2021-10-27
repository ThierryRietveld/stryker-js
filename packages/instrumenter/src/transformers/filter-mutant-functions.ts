import { NodePath, types } from '@babel/core';
import { ClassProperty, Identifier, Node, TSTypeAnnotation, TSTypeReference, TSArrayType } from '@babel/types';

import * as t from '@babel/types';

import { NodeMutator } from '../mutators';

export function isBlockStatementAndChangesMethodOrFunctionDeclaration(node: NodePath, mutator: NodeMutator, replacement: types.Node): boolean {
  // If is not a blockstatement
  if (node.type !== 'BlockStatement') return false;

  // If is not a function declaration or classmethod
  if (node.parent.type === 'FunctionDeclaration') {
    if (!node.parent.returnType) return false;
    return !nodeHasResturnTypeOfAnyVoidPromiseIterable(node.parent.returnType);
  } else if (node.parent.type === 'ClassMethod') {
    if (!node.parent.returnType) return false;
    return !nodeHasResturnTypeOfAnyVoidPromiseIterable(node.parent.returnType);
  }

  return false;

  function nodeHasResturnTypeOfAnyVoidPromiseIterable(returnTypeNode: Node): boolean {
    if ((returnTypeNode as TSTypeAnnotation).typeAnnotation.type === 'TSTypeReference') {
      // is generic
      const typeParameters = ((returnTypeNode as TSTypeAnnotation).typeAnnotation as TSTypeReference).typeParameters!;
      const identifier = ((returnTypeNode as TSTypeAnnotation).typeAnnotation as TSTypeReference).typeName as Identifier;
      // TODO: Add assert functions
      if (identifier.name === 'Promise') {
        if (typeParameters.params.length && typeParameters.params[0].type === 'TSVoidKeyword') return true;
        if (typeParameters.params.length && typeParameters.params[0].type === 'TSAnyKeyword') return true;
      }
      if (identifier.name === 'Iterable') return true;
    } else {
      // non generic
      const type = (returnTypeNode as TSTypeAnnotation).typeAnnotation.type;
      if (type === 'TSAnyKeyword') return true;
      if (type === 'TSVoidKeyword') return true;
    }
    return false;
  }
}

// export function isArrayExpressionAndHasCustomReturnTypeAndReplacesmentIsString(
//   node: NodePath,
//   mutator: NodeMutator,
//   replacement: types.Node
// ): boolean {
//   if (node.type !== 'ArrayExpression') return false;
//   if (replacement.type === 'ArrayExpression') {
//     if (replacement.elements.length) {
//       if (replacement.elements[0]?.type === 'StringLiteral') {
//         if (!(node.parent as ClassProperty).typeAnnotation) return false;
//         if (!(((node.parent as ClassProperty).typeAnnotation as TSTypeAnnotation).typeAnnotation as TSArrayType).elementType) return false;
//         if (
//           (((node.parent as ClassProperty).typeAnnotation as TSTypeAnnotation).typeAnnotation as TSArrayType).elementType.type !== 'TSAnyKeyword' &&
//           (((node.parent as ClassProperty).typeAnnotation as TSTypeAnnotation).typeAnnotation as TSArrayType).elementType.type !== 'TSUnknownKeyword'
//         ) {
//           return true;
//         }
//       }
//     }
//   }
//   return false;
// }

export function isArrayExpressionAndHasCustomReturnTypeAndReplacesmentIsString(
  node: NodePath,
  mutator: NodeMutator,
  replacement: types.Node
): boolean {
  if (!t.isArrayExpression(node, {})) return false;
  if (!t.isArrayExpression(replacement, {})) return false;
  if (!replacement.elements.length) return false;
  if (replacement.elements[0] === null) return false;
  if (!t.isStringLiteral(replacement.elements[0], {})) return false;
  if (!t.isClassProperty(node.parent, {})) return false;
  if (!node.parent.typeAnnotation) return false;

  // This type discriminator does not work as expected, the type becomes a never type
  if (!node.parent.typeAnnotation) return false;
  // TODO: Add string array type
  if (
    ((node.parent.typeAnnotation as t.TSTypeAnnotation).typeAnnotation as TSArrayType).elementType.type !== 'TSAnyKeyword' &&
    ((node.parent.typeAnnotation as t.TSTypeAnnotation).typeAnnotation as TSArrayType).elementType.type !== 'TSUnknownKeyword'
  ) {
    return true;
  }
  return false;
}
