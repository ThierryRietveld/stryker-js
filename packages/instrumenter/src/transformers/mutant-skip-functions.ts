import { NodePath, types } from '@babel/core';
import { ClassProperty, TSTypeAnnotation } from '@babel/types';

import { NodeMutator } from '../mutators';

export function isBlockStatementAndChangesFunctionDeclaration(node: NodePath, mutator: NodeMutator, replacement: types.Node): boolean {
  if (node.type !== 'BlockStatement') return false;
  if (node.parent.type !== 'FunctionDeclaration') return false;
  if (!node.parent.returnType) return false;
  if ((node.parent.returnType as TSTypeAnnotation).typeAnnotation.type === 'TSAnyKeyword') return false;

  return true;
}

export function isBlockStatementAndChangesClassMethod(node: NodePath, mutator: NodeMutator, replacement: types.Node): boolean {
  if (node.type !== 'BlockStatement') return false;
  if (node.parent.type !== 'ClassMethod') return false;
  if (!node.parent.returnType) return false;
  if ((node.parent.returnType as TSTypeAnnotation).typeAnnotation.type === 'TSAnyKeyword') return false;

  return true;
}

export function isArrayExpressionAndHasCustomReturnType(node: NodePath, mutator: NodeMutator, replacement: types.Node): boolean {
  if (node.type !== 'ArrayExpression') return false;
  if (replacement.type === 'ArrayExpression') {
    if (replacement.elements.length) {
      if (replacement.elements[0]?.type === 'StringLiteral') {
        if (!(node.parent as ClassProperty).typeAnnotation) return false;
        if (((node.parent as ClassProperty).typeAnnotation as TSTypeAnnotation).typeAnnotation.type !== 'TSAnyKeyword') {
          return true;
        }
      }
    }
  }

  return false;
}
