export class NanoSecondsTimer {
    
    constructor(private readonly startTime = process.hrtime.bigint()) {}

    public getElapsedNanoSeconds(): number {
        return Number(process.hrtime.bigint() - this.startTime);
    }

    public getElapsedSeconds(): number {
        return this.getElapsedNanoSeconds() / 1000000000;
    }

    public getElapsedTimeString(): string {
        const time = this.getElapsedNanoSeconds();
        return `${time}ns - ${time / 1000000}ms - ${time / 1000000000}s`;
    }
}