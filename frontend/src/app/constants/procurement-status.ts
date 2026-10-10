// Ogledalo backend/src/constants/procurement-status.ts
export enum ProcurementStatus {
    OPEN = 0,
    AWARDED = 1,
    FAILED = 2
}

export const PROCUREMENT_STATUS_LABELS: Record<number, string> = {
    [ProcurementStatus.OPEN]: 'Open for bidding',
    [ProcurementStatus.AWARDED]: 'Awarded',
    [ProcurementStatus.FAILED]: 'Closed without a valid bid'
};
