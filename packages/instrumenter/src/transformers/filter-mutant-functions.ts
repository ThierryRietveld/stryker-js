import { NodePath, types } from '@babel/core';
import { Identifier, Node, TSTypeAnnotation, TSTypeReference } from '@babel/types';

import * as t from '@babel/types';

import { NodeMutator } from '../mutators';

export function isBlockStatementAndChangesMethodOrFunctionDeclaration(node: NodePath, mutator: NodeMutator, replacement: types.Node): boolean {
  // If is not a blockstatement
  if (node.type !== 'BlockStatement') return false;

  // If is not a function declaration or classmethod
  if (node.parent.type === 'FunctionDeclaration') {
    if (!node.parent.returnType) return false;
    return !nodeHasResturnTypeOfAnyVoidPromiseIterable(node.parent.returnType, node.parent);
  } else if (node.parent.type === 'ClassMethod') {
    if (!node.parent.returnType) return false;
    return !nodeHasResturnTypeOfAnyVoidPromiseIterable(node.parent.returnType, node.parent);
  }

  return false;

  function nodeHasResturnTypeOfAnyVoidPromiseIterable(returnTypeNode: Node, parent: Node): boolean {
    if ((returnTypeNode as TSTypeAnnotation).typeAnnotation.type === 'TSTypeReference') {
      // is generic
      const identifier = ((returnTypeNode as TSTypeAnnotation).typeAnnotation as TSTypeReference).typeName as Identifier;
      if (identifier.name === 'Promise' && (parent as t.FunctionDeclaration).async) return true;
      if (identifier.name === 'Iterable') return true;
      if (identifier.name === 'AsyncGenerator') return true;
      if (identifier.name === 'Generator') return true;
    } else {
      // non generic
      const type = (returnTypeNode as TSTypeAnnotation).typeAnnotation.type;
      if (type === 'TSAnyKeyword') return true;
      if (type === 'TSVoidKeyword') return true;
      if (type === 'TSTypePredicate') return true;
    }
    return false;
  }
}

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

  if (t.isClassProperty(node.parent, {})) {
    if (!node.parent.typeAnnotation) return false;
    if (!t.isTSTypeAnnotation(node.parent.typeAnnotation, {})) return false;
    if (!t.isTSArrayType(node.parent.typeAnnotation.typeAnnotation, {})) return false;
    if (['TSAnyKeyword', 'TSUnknownKeyword', 'TSStringKeyword'].includes(node.parent.typeAnnotation.typeAnnotation.elementType.type)) return false;
  } else if (t.isVariableDeclarator(node.parent, {})) {
    if (!t.isIdentifier(node.parent.id, {})) return false;
    if (!t.isTSTypeAnnotation(node.parent.id.typeAnnotation, {})) return false;
    if (!t.isTSArrayType(node.parent.id.typeAnnotation.typeAnnotation, {})) return false;
    if (['TSAnyKeyword', 'TSUnknownKeyword', 'TSStringKeyword'].includes(node.parent.id.typeAnnotation.typeAnnotation.elementType.type)) return false;
  }

  return true;
}
