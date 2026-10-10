import { OrderItem } from './order-item';

// Faktura je uvek iz tacno jedne stamparije
export class Order {
    invoice_id = 0;

    // Ko je kupio
    // client_individual - faktura pripada licno tom useru
    // client_legal - faktura pripada ustanovi, pa je vide sve kolege
    client_username = '';
    client_institution_id = '';

    printer_institution_id = '';
    printer_name = '';          // server ga dovlaci sa ustanove
    printer_city = '';
    handled_by = '';            // zaposleni koji je poslednji pomerio fakturu

    // Za spisak stamparije: ko je porucio, kao firma ili kao osoba
    client_display = '';
    client_is_institution = false;

    items: OrderItem[] = [];
    total_amount = 0;
    status = 0;                 // OrderStatus
    procurement_id = 0;

    // Datumi stizu kao ISO stringovi
    ordered_at = '';
    delivered_at = '';
    received_at = '';
}
