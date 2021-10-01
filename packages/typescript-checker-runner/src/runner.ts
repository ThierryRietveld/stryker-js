import { HybridFileSystem, TypescriptChecker } from '@stryker-mutator/typescript-checker';
import { CurstomLogger } from './custom-logger';
import { CustomStrykerOptions } from './stryker-options';
import fs from 'fs';
import { Location, Mutant, MutantStatus } from '@stryker-mutator/api/core';
import { CustomHybridFileSystem } from './custom-hybrid-file-system';
import { NanoSecondsTimer } from './nano-seconds-runner';
import { CustomTypescriptChecker } from '@stryker-mutator/custom-typescript-checker';

// Dependencies
let logger = new CurstomLogger();
let strykerOptions = new CustomStrykerOptions();
let fileSystem = new CustomHybridFileSystem(logger);

let typescriptChecker = new CustomTypescriptChecker(logger, strykerOptions, fileSystem);

void async function() {

    try {
        await typescriptChecker.init();

        const mutant: Mutant = {
            fileName: `C:/Users/ThierryR/Dev/stryker-typescript-checker-runner/packages/typescript-checker-runner/tsfiles/tsfile.ts`,
            replacement: "const test = 3;",
            id: "1",
            location: {
                start: {
                    column: 0,
                    line: 0
                },
                end: {
                    column: 25,
                    line: 0
                }
            },
            mutatorName: "Test mutant"
        }

        for(let i = 0; i < 10; i++) {
            const timer = new NanoSecondsTimer();
            const checkResult = await typescriptChecker.check(mutant);
            console.log("mutant timer:" + timer.getElapsedTimeString())
        }
        
        console.log(JSON.stringify(await typescriptChecker.end()));
        process.exit(1);
    } catch(error) {
        console.log(error)
        // const splittedError = error.toString().split(' ');
        // const wholePath = splittedError[splittedError.length - 3];
        // const pathArray = wholePath.split('/');
        // const file = pathArray.pop();
        // fs.promises.mkdir(pathArray.join('/'), { recursive: true })
        // fs.writeFile(wholePath, "", () => {})
        // console.log(pathArray.join('/'), file)
    }
}();
