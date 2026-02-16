"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getValidComponent = void 0;
var tslib_1 = require("tslib");
var react_1 = tslib_1.__importDefault(require("react"));
/**
 * Helper function to handle both React components and React elements.
 * This utility ensures proper rendering of components whether they are passed as
 * component types or pre-rendered elements.
 *
 * @param component - Can be a React component type, React element, null, or undefined
 * @returns A valid React element if the input is valid, null otherwise
 *
 * @example
 * // With a component type
 * getValidComponent(MyComponent)
 *
 * @example
 * // With a pre-rendered element
 * getValidComponent(<MyComponent />)
 */
var getValidComponent = function (component) {
    if (react_1.default.isValidElement(component)) {
        return component;
    }
    else if (typeof component === "function") {
        return react_1.default.createElement(component);
    }
    return null;
};
exports.getValidComponent = getValidComponent;
//# sourceMappingURL=componentUtils.js.map