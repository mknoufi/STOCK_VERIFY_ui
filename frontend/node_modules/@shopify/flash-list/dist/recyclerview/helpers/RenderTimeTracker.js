"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RenderTimeTracker = void 0;
var PlatformHelper_1 = require("../../native/config/PlatformHelper");
var AverageWindow_1 = require("../../utils/AverageWindow");
var RenderTimeTracker = /** @class */ (function () {
    function RenderTimeTracker() {
        this.renderTimeAvgWindow = new AverageWindow_1.AverageWindow(5);
        this.lastTimerStartedAt = -1;
        this.maxRenderTime = 32; // TODO: Improve this even more
        this.defaultRenderTime = 16;
        this.rendersWithoutCommit = 0;
        this.maxRendersWithoutCommit = 40;
    }
    RenderTimeTracker.prototype.startTracking = function () {
        this.rendersWithoutCommit++;
        if (!PlatformHelper_1.PlatformConfig.trackAverageRenderTimeForOffsetProjection) {
            return;
        }
        if (this.lastTimerStartedAt === -1) {
            this.lastTimerStartedAt = Date.now();
        }
    };
    RenderTimeTracker.prototype.markRenderComplete = function () {
        this.rendersWithoutCommit = 0;
        if (!PlatformHelper_1.PlatformConfig.trackAverageRenderTimeForOffsetProjection) {
            return;
        }
        if (this.lastTimerStartedAt !== -1) {
            this.renderTimeAvgWindow.addValue(Date.now() - this.lastTimerStartedAt);
            this.lastTimerStartedAt = -1;
        }
    };
    RenderTimeTracker.prototype.hasExceededMaxRendersWithoutCommit = function () {
        return this.rendersWithoutCommit >= this.maxRendersWithoutCommit;
    };
    RenderTimeTracker.prototype.getRawValue = function () {
        return this.renderTimeAvgWindow.currentValue;
    };
    RenderTimeTracker.prototype.getAverageRenderTime = function () {
        if (!PlatformHelper_1.PlatformConfig.trackAverageRenderTimeForOffsetProjection) {
            return this.defaultRenderTime;
        }
        return Math.min(this.maxRenderTime, Math.max(Math.round(this.renderTimeAvgWindow.currentValue), 16));
    };
    return RenderTimeTracker;
}());
exports.RenderTimeTracker = RenderTimeTracker;
//# sourceMappingURL=RenderTimeTracker.js.map