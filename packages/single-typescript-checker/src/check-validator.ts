import ts from 'typescript';

import { formatErrors } from './single-typescript-checker';

export function AllAtOnceCheckValid(errors: readonly ts.Diagnostic[]): readonly ts.Diagnostic[] | null {
  const validErrors: ts.Diagnostic[] = [];

  // eslint-disable-next-line @typescript-eslint/no-for-in-array
  for (const key in errors) {
    const error = errors[key];

    if ([2322, 2345, 2769].includes(error.code)) {
      return null;
      // const errorText = formatErrors([error]);
      // const includesFormatted = /import\(.*-mutated.*?\)/.exec(errorText);

      // if (includesFormatted) continue;
      // else return null;
    }

    // if (error.code === 2769) return null;

    validErrors.push(error);
  }

  return errors;
}
