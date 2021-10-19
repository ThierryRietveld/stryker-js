import { NodePath, types, traverse } from '@babel/core';
import {
  BlockStatement,
  ClassProperty,
  ExpressionStatement,
  Identifier,
  IfStatement,
  Node,
  Noop,
  TSTypeAnnotation,
  TSTypeParameterInstantiation,
  TSTypeReference,
  TypeAnnotation,
  typeParameter,
} from '@babel/types';

import * as t from '@babel/types';

import { NodeMutator } from '../mutators';

// Promise<void>
// {
//   returnType: tSTypeAnnotation {
//     typeAnnotation: tSTypeReference {
//       typeParameter: tsTypeParameterInstantiation {
//         params: Node[] {
//           type: string
//         }
//       }
//     }
//   }
// }

// number
// {
//   returnType: tSTypeAnnotation {
//     typeAnnotation: TSNumberKeyword {
//       type: string
//     }
//   }
// }

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

export function isArrayExpressionAndHasCustomReturnTypeAndReplacesmentIsString(
  node: NodePath,
  mutator: NodeMutator,
  replacement: types.Node
): boolean {
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

export function isCheckingNullOrUndifinedOnConditionalExpression(nodePath: NodePath, mutator: NodeMutator, replacement: types.Node): boolean {
  traverse(
    nodePath.node,
    {
      enter(path) {
        console.log('path');
      },
    },
    nodePath.scope,
    null,
    nodePath.parentPath ?? undefined
  );

  // if (mutator.name !== 'ConditionalExpression') return false;
  // if (!['Identifier', 'MemberExpression'].includes(node.type)) return false;
  // if (!t.isIfStatement(node.container, null)) return false;

  // const ifTester = node.container.test;
  // const body = node.container.consequent;

  // if (t.isBlockStatement(body, null)) {
  //   body.body.forEach((childNode) => {
  //     if (t.isExpressionStatement(childNode, null)) {

  //     }
  //   })
  //   console.log('block');
  // } else if (t.isExpressionStatement(body, null)) {
  //   body.expression
  //   console.log('expression');
  // }

  // If ifstatement body is blockstatement or expressionstatement

  return true;
}
