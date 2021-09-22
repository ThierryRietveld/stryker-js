import { Mutant } from "@stryker-mutator/api/core";
import { HybridFileSystem } from "@stryker-mutator/typescript-checker";
import { Timer } from '@stryker-mutator/core';
import { NanoSecondsTimer } from "./nano-seconds-runner";


export class CustomHybridFileSystem extends HybridFileSystem {
    private totalMutateTimeInMS = 0;

    public override mutate(mutant: Pick<Mutant, 'fileName' | 'location' | 'replacement'>): void {
        const timer = new NanoSecondsTimer();
        super.mutate(mutant);
        let time = timer.getElapsedNanoSeconds();
        console.log(timer.getElapsedTimeString())
        this.totalMutateTimeInMS += Number(time);
    }

    public getElapsedMutateTimeString(): string {
        return `${this.totalMutateTimeInMS}ns - ${this.totalMutateTimeInMS / 1000000}ms - ${this.totalMutateTimeInMS / 1000000000}s`;
    }
    
} 