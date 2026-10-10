"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRINTER_TRANSITIONS = exports.OrderStatus = void 0;
var OrderStatus;
(function (OrderStatus) {
    OrderStatus[OrderStatus["ORDERED"] = 0] = "ORDERED";
    OrderStatus[OrderStatus["IN_PRINTING"] = 2] = "IN_PRINTING";
    OrderStatus[OrderStatus["DELIVERED"] = 3] = "DELIVERED";
    OrderStatus[OrderStatus["RECEIVED"] = 4] = "RECEIVED";
    // Izlaz iz lanca: klijent je odustao pre pocetka stampe. Faktura ostaje zbog istorije, komadi se vracaju na stanje
    OrderStatus[OrderStatus["CANCELLED"] = 5] = "CANCELLED";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
// Stamparija moze da pomeri porudzbinu samo jedan korak unapred
exports.PRINTER_TRANSITIONS = {
    [OrderStatus.ORDERED]: OrderStatus.IN_PRINTING,
    [OrderStatus.IN_PRINTING]: OrderStatus.DELIVERED
};
