"use strict";
/**
 * ScrollAnchor component provides a mechanism to programmatically scroll
 * the list by manipulating an invisible anchor element's position.
 * This helps us use ScrollView's maintainVisibleContentPosition property
 * to adjust the scroll position of the list as the size of content changes without any glitches.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScrollAnchor = ScrollAnchor;
var tslib_1 = require("tslib");
var react_1 = tslib_1.__importStar(require("react"));
var CompatView_1 = require("./CompatView");
/**
 * ScrollAnchor component that provides programmatic scrolling capabilities using maintainVisibleContentPosition property
 * @param props - Component props
 * @returns An invisible anchor element used for scrolling
 */
function ScrollAnchor(_a) {
    var scrollAnchorRef = _a.scrollAnchorRef, horizontal = _a.horizontal;
    var _b = tslib_1.__read((0, react_1.useState)(1000000), 2), scrollOffset = _b[0], setScrollOffset = _b[1]; // TODO: Fix this value
    // Expose scrollBy method through ref
    (0, react_1.useImperativeHandle)(scrollAnchorRef, function () { return ({
        scrollBy: function (offset) {
            setScrollOffset(function (prev) { return prev + offset; });
        },
    }); }, []);
    // Create an invisible anchor element that can be positioned
    var anchor = (0, react_1.useMemo)(function () {
        return (react_1.default.createElement(CompatView_1.CompatView, { style: {
                position: "absolute",
                height: 0,
                top: horizontal ? 0 : scrollOffset,
                left: horizontal ? scrollOffset : 0,
            } }));
    }, [scrollOffset, horizontal]);
    return anchor;
}
//# sourceMappingURL=ScrollAnchor.js.map