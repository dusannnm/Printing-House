// Ogledalo backend/src/constants/user-status.ts
export enum UserStatus {
    PENDING = 0,
    ACTIVE = 1,
    REJECTED = 2
}

export const USER_STATUS_LABELS: Record<number, string> = {
    [UserStatus.PENDING]: 'Waiting for approval',
    [UserStatus.ACTIVE]: 'Active',
    [UserStatus.REJECTED]: 'Rejected'
};
