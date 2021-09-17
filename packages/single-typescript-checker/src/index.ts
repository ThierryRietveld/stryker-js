import { PluginKind, declareFactoryPlugin } from '@stryker-mutator/api/plugin';

import { create } from './single-typescript-checker';

export const strykerPlugins = [declareFactoryPlugin(PluginKind.Checker, 'single-typescript', create)];

// export const createTypescriptChecker = create;
