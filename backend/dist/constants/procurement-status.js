"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BIDDING_DURATION_MS = exports.ProcurementStatus = void 0;
var ProcurementStatus;
(function (ProcurementStatus) {
    ProcurementStatus[ProcurementStatus["OPEN"] = 0] = "OPEN";
    ProcurementStatus[ProcurementStatus["AWARDED"] = 1] = "AWARDED";
    ProcurementStatus[ProcurementStatus["FAILED"] = 2] = "FAILED";
})(ProcurementStatus || (exports.ProcurementStatus = ProcurementStatus = {}));
// Licitacija traje tacno 10 minuta od objavljivanja nabavke
exports.BIDDING_DURATION_MS = 10 * 60 * 1000;
