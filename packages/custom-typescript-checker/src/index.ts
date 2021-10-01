import { declareFactoryPlugin, PluginKind, tokens } from '@stryker-mutator/api/plugin';

import { create } from './custom-typescript-checker';

export { CustomTypescriptChecker } from './custom-typescript-checker';

export const strykerPlugins = [declareFactoryPlugin(PluginKind.Checker, 'custom-typescript-checker', create)];
