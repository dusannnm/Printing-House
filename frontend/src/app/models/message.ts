// Svaki odgovor sa backenda nosi kljuc "message" sa statusom ili tekstom greske
export class Message {
    message = '';

    // Postavlja samo slanje slike, kao ime pod kojim je fajl sacuvan
    filename?: string;

    // Postavlja se samo pri potvrdi korpe: napravljene fakture
    invoice_ids?: number[];
}
