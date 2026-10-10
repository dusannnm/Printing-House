"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserStatus = void 0;
// Ishod zahteva za registraciju - nalog je upotrebljiv tek kad ga admin odobri
var UserStatus;
(function (UserStatus) {
    UserStatus[UserStatus["PENDING"] = 0] = "PENDING";
    UserStatus[UserStatus["ACTIVE"] = 1] = "ACTIVE";
    UserStatus[UserStatus["REJECTED"] = 2] = "REJECTED";
})(UserStatus || (exports.UserStatus = UserStatus = {}));
