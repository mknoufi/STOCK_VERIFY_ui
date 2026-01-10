"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roundToDecimalPlaces = roundToDecimalPlaces;
function roundToDecimalPlaces(value, decimalPlaces) {
    var multiplier = Math.pow(10, decimalPlaces);
    return Math.round(value * multiplier) / multiplier;
}
//# sourceMappingURL=roundToDecimalPlaces.js.map