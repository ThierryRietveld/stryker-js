import { Logger } from "@stryker-mutator/api/logging";

export class CurstomLogger implements Logger {
    isTraceEnabled(): boolean {
        throw new Error("Method not implemented.");
    }
    isDebugEnabled(): boolean {
        throw new Error("Method not implemented.");
    }
    isInfoEnabled(): boolean {
        throw new Error("Method not implemented.");
    }
    isWarnEnabled(): boolean {
        throw new Error("Method not implemented.");
    }
    isErrorEnabled(): boolean {
        throw new Error("Method not implemented.");
    }
    isFatalEnabled(): boolean {
        throw new Error("Method not implemented.");
    }
    trace(message: string, ...args: any[]): void {
        console.log(message);
    }
    debug(message: string, ...args: any[]): void {
        console.log(message);
    }
    info(message: string, ...args: any[]): void {
        console.log(message);
    }
    warn(message: string, ...args: any[]): void {
        console.log(message);
    }
    error(message: string, ...args: any[]): void {
        console.log(message);
    }
    fatal(message: string, ...args: any[]): void {
        console.log(message);
    }

}