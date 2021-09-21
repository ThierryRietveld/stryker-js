export class NanoSecondsTimer {
    
    constructor(private readonly startTime = process.hrtime.bigint()) {}

    public getElapsedNanoSeconds(): bigint {
        return process.hrtime.bigint() - this.startTime;
    }

    public getElapsedSeconds() {
        return this.getElapsedNanoSeconds() / BigInt(1000000000);
    }

    getElapsedTimeString(): string {
        const time = this.getElapsedNanoSeconds();
        // return `${time}ns - ${time / 1000000n}ms - ${time / 1000000000}s`;
    }
}