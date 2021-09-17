import { PluginKind, declareFactoryPlugin } from '@stryker-mutator/api/plugin';

import { create } from './typescript-checker';

export { HybridFileSystem } from './fs/hybrid-file-system';

export const strykerPlugins = [declareFactoryPlugin(PluginKind.Checker, 'typescript', create)];

export const createTypescriptChecker = create;
