// Ogledalo backend/src/constants/order-status.ts
export enum OrderStatus {
    ORDERED = 0,
    IN_PRINTING = 2,
    DELIVERED = 3,
    RECEIVED = 4,

    // Izlaz iz lanca, a ne korak u njemu; mora da se ponisti pre pocetka stampe
    CANCELLED = 5
}

// Ogledalo PRINTER_TRANSITIONS sa servera, koji jedini stvarno sprovodi pravilo - ovde status koji nije kljuc samo ne dobija dugme
export const PRINTER_TRANSITIONS: Record<number, number> = {
    [OrderStatus.ORDERED]: OrderStatus.IN_PRINTING,
    [OrderStatus.IN_PRINTING]: OrderStatus.DELIVERED
};

export const ORDER_STATUS_LABELS: Record<number, string> = {
    [OrderStatus.ORDERED]: 'Ordered',
    [OrderStatus.IN_PRINTING]: 'In printing',
    [OrderStatus.DELIVERED]: 'Delivered',
    [OrderStatus.RECEIVED]: 'Received',
    [OrderStatus.CANCELLED]: 'Cancelled'
};
