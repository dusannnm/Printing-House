export enum ProcurementStatus {
    OPEN = 0,
    AWARDED = 1,
    FAILED = 2
}

// Licitacija traje tacno 10 minuta od objavljivanja nabavke
export const BIDDING_DURATION_MS = 10 * 60 * 1000;
