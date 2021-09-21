import { PluginKind, declareFactoryPlugin } from '@stryker-mutator/api/plugin';

import { create } from './typescript-checker';

export { HybridFileSystem } from './fs';

export { TypescriptChecker } from './typescript-checker';

export const strykerPlugins = [declareFactoryPlugin(PluginKind.Checker, 'typescript', create)];

export const createTypescriptChecker = create;
