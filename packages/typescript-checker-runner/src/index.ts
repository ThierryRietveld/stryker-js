import { HybridFileSystem, TypescriptChecker } from '@stryker-mutator/typescript-checker';
import { CurstomLogger } from './customLogger';
import { CustomStrykerOptions } from './strykerOptions';
import fs from 'fs';
import { Location, Mutant, MutantStatus } from '@stryker-mutator/api/core';
import { CustomHybridFileSystem } from './CustomHybridFileSystem';
import { NanoSecondsTimer } from './NanoSecondsTimer';

export { NanoSecondsTimer } from './NanoSecondsTimer';;

// Dependencies
let logger = new CurstomLogger();
let strykerOptions = new CustomStrykerOptions();
let fileSystem = new CustomHybridFileSystem(logger);

let typescriptChecker = new TypescriptChecker(logger, strykerOptions, fileSystem);

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

        console.time();
        
        for(let i = 0; i < 10; i++) {
            const timer = new NanoSecondsTimer();
            const checkResult = await typescriptChecker.check(mutant);
            console.log("mutant timer:" + timer.getElapsedTimeString())
        }

        console.timeEnd();
        console.log(fileSystem.getElapsedMutateTimeString());
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
