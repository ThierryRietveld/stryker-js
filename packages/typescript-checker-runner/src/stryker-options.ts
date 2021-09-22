import { ClearTextReporterOptions, CommandRunnerOptions, CoverageAnalysis, DashboardOptions, EventRecorderOptions, HtmlReporterOptions, JsonReporterOptions, LogLevel, MutationScoreThresholds, MutatorDescriptor, StrykerOptions, WarningOptions } from "@stryker-mutator/api/core";

export class CustomStrykerOptions implements StrykerOptions {
    [k: string]: unknown;
    allowConsoleColors: boolean;
    buildCommand?: string;
    checkers: string[];
    concurrency?: number;
    maxTestRunnerReuse: number;
    commandRunner: CommandRunnerOptions;
    coverageAnalysis: CoverageAnalysis;
    clearTextReporter: ClearTextReporterOptions;
    dashboard: DashboardOptions;
    eventReporter: EventRecorderOptions;
    ignorePatterns: string[];
    fileLogLevel: LogLevel;
    inPlace: boolean;
    logLevel: LogLevel;
    maxConcurrentTestRunners: number;
    mutate: string[];
    mutator: MutatorDescriptor;
    packageManager?: "npm" | "yarn";
    plugins: string[];
    appendPlugins: string[];
    reporters: string[];
    htmlReporter?: HtmlReporterOptions;
    jsonReporter: JsonReporterOptions;
    disableTypeChecks: string | false;
    symlinkNodeModules: boolean;
    tempDirName: string;
    cleanTempDir: boolean;
    testRunner: string;
    testRunnerNodeArgs: string[];
    thresholds: MutationScoreThresholds;
    timeoutFactor: number;
    timeoutMS: number;
    dryRunTimeoutMinutes: number;
    tsconfigFile: string = "./tsfiles/tsconfig.json";
    warnings: boolean | WarningOptions;
    disableBail: boolean;

}