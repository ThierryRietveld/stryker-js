import { NodePath, types } from '@babel/core';
import { ClassProperty, is, TSTypeAnnotation, TSTypeReference } from '@babel/types';

import { NodeMutator } from '../mutators';

export function isBlockStatementAndChangesFunctionDeclaration(node: NodePath, mutator: NodeMutator, replacement: types.Node): boolean {
  // If is not a blockstatement
  if (node.type !== 'BlockStatement') return false;

  // If is not a function declaration or classmethod
  if (node.parent.type !== 'FunctionDeclaration') return false;

  // If has return type
  if (!node.parent.returnType) return false;

  // If is not return type of any or void
  if ((node.parent.returnType as TSTypeAnnotation).typeAnnotation.type === 'TSAnyKeyword') return false;
  if ((node.parent.returnType as TSTypeAnnotation).typeAnnotation.type === 'TSVoidKeyword') return false;

  // If is not a Promise<any> or Promise<void>
  // TODO
  // if (((node.parent.returnType as TSTypeAnnotation).typeAnnotation as TSTypeReference).typeName.name === 'TSVoidKeyword') return false;

  return true;
}

export function isBlockStatementAndChangesMethodDeclaration(node: NodePath, mutator: NodeMutator, replacement: types.Node): boolean {
  // If is not a blockstatement
  if (node.type !== 'BlockStatement') return false;

  // If is not a function declaration or classmethod
  if (node.parent.type !== 'ClassMethod') return false;

  // If has return type
  if (!node.parent.returnType) return false;

  // If is not return type of any or void
  if ((node.parent.returnType as TSTypeAnnotation).typeAnnotation.type === 'TSAnyKeyword') return false;
  if ((node.parent.returnType as TSTypeAnnotation).typeAnnotation.type === 'TSVoidKeyword') return false;

  // If is not a Promise<any> or Promise<void>
  // TODO
  // if (((node.parent.returnType as TSTypeAnnotation).typeAnnotation as TSTypeReference).typeName.name === 'TSVoidKeyword') return false;

  return true;
}

export function isArrayExpressionAndHasCustomReturnTypeAndReplacesmentIsString(node: NodePath, mutator: NodeMutator, replacement: types.Node): boolean {
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
