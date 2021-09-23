import { Mutant } from "../core";

export interface CheckerTimeResult {
    checkCount: number;
    avgCheckTimeInS: number;
    highestCheckTime: number;
    totalCheckTimeInS: number;
}

export interface MutantTime {
    mutant: Mutant;
    timeInS: number;
}