"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VelocityTracker = void 0;
/**
 * Tracks and calculates velocity for scroll/drag movements
 * Used to determine momentum scrolling behavior
 */
var VelocityTracker = /** @class */ (function () {
    function VelocityTracker() {
        /** Timestamp of the last velocity update */
        this.lastUpdateTime = Date.now();
        /** Current velocity vector with x and y components */
        this.velocity = { x: 0, y: 0 };
        /** Reference to the momentum end timeout */
        this.timeoutId = null;
    }
    /**
     * Calculates velocity based on position change over time
     * @param newOffset Current position value
     * @param oldOffset Previous position value
     * @param isHorizontal Whether movement is horizontal (true) or vertical (false)
     * @param isRTL Whether layout direction is right-to-left
     * @param callback Function to call with velocity updates and momentum end signal
     */
    VelocityTracker.prototype.computeVelocity = function (newOffset, oldOffset, isHorizontal, callback) {
        var _this = this;
        // Clear any pending momentum end timeout
        this.cleanUp();
        // Calculate time since last update
        var currentTime = Date.now();
        var timeSinceLastUpdate = Math.max(1, currentTime - this.lastUpdateTime);
        // Calculate velocity as distance/time
        var newVelocity = (newOffset - oldOffset) / timeSinceLastUpdate;
        // console.log(
        //   "newVelocity",
        //   newOffset,
        //   oldOffset,
        //   currentTime,
        //   this.lastUpdateTime,
        //   timeSinceLastUpdate,
        //   newVelocity
        // );
        this.lastUpdateTime = currentTime;
        // Apply velocity to the correct axis
        this.velocity.x = isHorizontal ? newVelocity : 0;
        this.velocity.y = isHorizontal ? 0 : newVelocity;
        // Trigger callback with current velocity
        callback(this.velocity, false);
        // Set timeout to signal momentum end after 100ms of no updates
        this.timeoutId = setTimeout(function () {
            _this.cleanUp();
            _this.lastUpdateTime = Date.now();
            _this.velocity.x = 0;
            _this.velocity.y = 0;
            callback(_this.velocity, true);
        }, 100);
    };
    /**
     * Cleans up resources by clearing any pending timeout
     */
    VelocityTracker.prototype.cleanUp = function () {
        if (this.timeoutId !== null) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    };
    return VelocityTracker;
}());
exports.VelocityTracker = VelocityTracker;
//# sourceMappingURL=VelocityTracker.js.map