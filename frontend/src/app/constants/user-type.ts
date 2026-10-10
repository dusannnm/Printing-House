// Ogledalo backend/src/constants/user-type.ts
export enum UserType {
    CLIENT_INDIVIDUAL = 'client_individual',
    CLIENT_LEGAL = 'client_legal',
    PRINTER = 'printer',
    ADMIN = 'admin'
}

export const INSTITUTION_TYPES: string[] = [UserType.CLIENT_LEGAL, UserType.PRINTER];
export const CLIENT_TYPES: string[] = [UserType.CLIENT_INDIVIDUAL, UserType.CLIENT_LEGAL];

// Admin se nikada ne registruje sam
export const REGISTRABLE_TYPES: string[] = [UserType.CLIENT_INDIVIDUAL, UserType.CLIENT_LEGAL, UserType.PRINTER];

// Gde koja uloga pocinje posle prijave
// Koriste ga forme za prijavu i guard koji prijavljenog korisnika drzi dalje od tih formi
export const HOME_ROUTE: Record<string, string> = {
    [UserType.CLIENT_INDIVIDUAL]: '/client',
    [UserType.CLIENT_LEGAL]: '/client',
    [UserType.PRINTER]: '/printer',
    [UserType.ADMIN]: '/admin'
};

export const USER_TYPE_LABELS: Record<string, string> = {
    [UserType.CLIENT_INDIVIDUAL]: 'Client - individual',
    [UserType.CLIENT_LEGAL]: 'Client - legal entity',
    [UserType.PRINTER]: 'Print shop',
    [UserType.ADMIN]: 'Administrator'
};
