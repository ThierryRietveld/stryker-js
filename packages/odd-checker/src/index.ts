import { PluginKind, declareFactoryPlugin } from '@stryker-mutator/api/plugin';

import { create } from './odd-checker';

export const strykerPlugins = [declareFactoryPlugin(PluginKind.Checker, 'odd-checker', create)];
