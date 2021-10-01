import { create } from './custom-typescript-checker';
import { declareFactoryPlugin, PluginKind, tokens } from '@stryker-mutator/api/plugin';

export { CustomTypescriptChecker } from './custom-typescript-checker';

export const strykerPlugins = [declareFactoryPlugin(PluginKind.Checker, 'custom-typescript-checker', create)];