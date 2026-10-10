export enum OrderStatus {
    ORDERED = 0,
    IN_PRINTING = 2,
    DELIVERED = 3,
    RECEIVED = 4,

    // Izlaz iz lanca: klijent je odustao pre pocetka stampe. Faktura ostaje zbog istorije, komadi se vracaju na stanje
    CANCELLED = 5
}

// Stamparija moze da pomeri porudzbinu samo jedan korak unapred
export const PRINTER_TRANSITIONS: Record<number, number> = {
    [OrderStatus.ORDERED]: OrderStatus.IN_PRINTING,
    [OrderStatus.IN_PRINTING]: OrderStatus.DELIVERED
};
