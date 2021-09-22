import CustomTypescriptChecker, { create } from './custom-typescript-checker';
// import FooTestRunnerConfigFileLoader from './foo-test-runner-config-file-loader';
import { declareFactoryPlugin, PluginKind, tokens } from '@stryker-mutator/api/plugin';

export const strykerPlugins = [declareFactoryPlugin(PluginKind.Checker, 'custom-typescript-checker', create)];