import { RequestedItem } from './requested-item';
import { OfferLine } from './offer-line';

// Nabavka kako je vidi stamparija: sta se trazi, da li moze da isporuci i da li se vec javila
export class OpenProcurement {
    procurement_id = 0;
    opened_at = '';
    closes_at = '';
    client_name = '';

    requested_items: RequestedItem[] = [];
    offer_lines: OfferLine[] = [];

    can_supply = false;
    already_bid = false;
}
