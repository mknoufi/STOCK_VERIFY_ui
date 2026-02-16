"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNewArch = isNewArch;
var react_native_1 = require("react-native");
var _isNewArch;
function isNewArch() {
    if (_isNewArch !== undefined) {
        return _isNewArch;
    }
    else {
        try {
            // Check for Fabric UI Manager
            var hasFabricUIManager = Boolean(global === null || global === void 0 ? void 0 : global.nativeFabricUIManager);
            // Check for TurboModule system
            var hasTurboModule = Boolean(global === null || global === void 0 ? void 0 : global.__turboModuleProxy);
            _isNewArch =
                hasFabricUIManager || hasTurboModule || react_native_1.Platform.OS === "web";
        }
        catch (_a) {
            _isNewArch = true;
        }
    }
    return _isNewArch;
}
//# sourceMappingURL=isNewArch.js.map