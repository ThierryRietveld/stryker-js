import ts from 'typescript';

import { formatErrors } from './single-typescript-checker';

export function AllAtOnceCheckValid(errors: readonly ts.Diagnostic[]): ts.Diagnostic[] {
  const validErrors: ts.Diagnostic[] = [];

  // eslint-disable-next-line @typescript-eslint/no-for-in-array
  for (const key in errors) {
    const error = errors[key];
    const errorText = formatErrors([error]);

    if (2345 === error.code) {
      const match = /'this' is not assignable/.exec(errorText);
      if (match) continue;
    }

    if ([2322, 2345, 2769].includes(error.code)) {
      const includesFormatted = /import\(.*-mutated.*?\)/.exec(errorText);
      if (includesFormatted) continue;
    }

    validErrors.push(error);
  }

  return validErrors;
}
