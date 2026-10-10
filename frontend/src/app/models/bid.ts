import { BidItem } from './bid-item';

// Svaka stamparija salje tacno jednu ponudu po nabavci
export class Bid {
    institution_id = '';
    printer_name = '';        // server ga dovlaci sa ustanove
    submitted_by = '';        // zaposleni koji je poslao ponudu
    items: BidItem[] = [];
    total_amount = 0;
    submitted_at = '';
}
