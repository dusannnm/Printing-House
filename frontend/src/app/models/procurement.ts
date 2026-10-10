import { RequestedItem } from './requested-item';
import { Bid } from './bid';

// Poziv za ponude koji objavljuje client_legal
// Licitacija traje deset minuta, a pobednik se bira kad ustanova sledeci put otvori svoju stranicu nabavki
export class Procurement {
    procurement_id = 0;
    client_institution_id = '';
    opened_by = '';           // zaposleni koji ju je objavio

    // Datumi stizu kao ISO stringovi
    opened_at = '';
    closes_at = '';

    requested_items: RequestedItem[] = [];
    bids: Bid[] = [];

    status = 0;               // ProcurementStatus
    winner_institution_id = '';
    winner_name = '';         // dovlaci ga server
    invoice_id = 0;           // faktura napravljena za pobednicku ponudu
}
