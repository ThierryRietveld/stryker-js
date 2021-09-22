import CustomTypescriptChecker, { create } from './custom-typescript-checker';
import { declareFactoryPlugin, PluginKind, tokens } from '@stryker-mutator/api/plugin';

export const strykerPlugins = [declareFactoryPlugin(PluginKind.Checker, 'custom-typescript-checker', create)];