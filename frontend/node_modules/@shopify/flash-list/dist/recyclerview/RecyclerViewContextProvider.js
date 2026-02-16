"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecyclerViewContextProvider = void 0;
exports.useRecyclerViewContext = useRecyclerViewContext;
exports.useFlashListContext = useFlashListContext;
var react_1 = require("react");
var RecyclerViewContextInstance = (0, react_1.createContext)(undefined);
exports.RecyclerViewContextProvider = RecyclerViewContextInstance.Provider;
function useRecyclerViewContext() {
    return (0, react_1.useContext)(RecyclerViewContextInstance);
}
function useFlashListContext() {
    return (0, react_1.useContext)(RecyclerViewContextInstance);
}
//# sourceMappingURL=RecyclerViewContextProvider.js.map