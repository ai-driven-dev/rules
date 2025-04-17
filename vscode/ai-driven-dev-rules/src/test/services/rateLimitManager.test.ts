import type * as http from "node:http";
import * as sinon from "sinon";
import type { GithubRateLimit } from "../../api/types";
import { type ILogger, Logger } from "../../services/logger";
import {
  type IRateLimitManager,
  RateLimitManager,
} from "../../services/rateLimitManager";

describe("RateLimitManager", () => {
  let rateLimitManager: IRateLimitManager;
  let mockLogger: sinon.SinonStubbedInstance<ILogger>;
  let clock: sinon.SinonFakeTimers;
  let expect: Chai.ExpectStatic;

  const nowSeconds = Math.floor(Date.now() / 1000);
  const resetTimeFuture = nowSeconds + 3600; // 1 hour in the future
  const resetTimePast = nowSeconds - 3600; // 1 hour in the past

  const headersOk: http.IncomingHttpHeaders = {
    "x-ratelimit-limit": "5000",
    "x-ratelimit-remaining": "4999",
    "x-ratelimit-reset": resetTimeFuture.toString(),
  };

  const headersLimited: http.IncomingHttpHeaders = {
    "x-ratelimit-limit": "5000",
    "x-ratelimit-remaining": "0",
    "x-ratelimit-reset": resetTimeFuture.toString(),
  };

  const headersLimitedPastReset: http.IncomingHttpHeaders = {
    "x-ratelimit-limit": "5000",
    "x-ratelimit-remaining": "0",
    "x-ratelimit-reset": resetTimePast.toString(),
  };

  const headersMissing: http.IncomingHttpHeaders = {
    "x-ratelimit-limit": "5000",
    // remaining is missing
    "x-ratelimit-reset": resetTimeFuture.toString(),
  };

  before(async () => {
    const chai = await import("chai");
    expect = chai.expect;
  });

  beforeEach(() => {
    mockLogger = sinon.createStubInstance(Logger);
    rateLimitManager = new RateLimitManager(mockLogger);
    // Use fake timers to control time for reset checks
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    sinon.restore();
    clock.restore();
  });

  it("should initialize with null rate limit info", () => {
    expect(rateLimitManager.getRateLimitInfo()).to.be.null;
    expect(rateLimitManager.getResetTime()).to.be.null;
    expect(rateLimitManager.isLimitExceeded()).to.be.false;
  });

  describe("updateFromHeaders", () => {
    it("should update rate limit info from valid headers", () => {
      rateLimitManager.updateFromHeaders(headersOk);
      const info = rateLimitManager.getRateLimitInfo();
      expect(info).to.deep.equal({
        limit: 5000,
        remaining: 4999,
        reset: resetTimeFuture,
      });
      sinon.assert.calledWith(
        mockLogger.debug,
        sinon.match(/Rate limit updated/),
      );
    });

    it("should not update or log if headers provide the same info", () => {
      rateLimitManager.updateFromHeaders(headersOk); // Initial update
      mockLogger.debug.resetHistory();
      rateLimitManager.updateFromHeaders(headersOk); // Update with same headers
      const info = rateLimitManager.getRateLimitInfo();
      expect(info).to.deep.equal({
        // Info should still be the same
        limit: 5000,
        remaining: 4999,
        reset: resetTimeFuture,
      });
      sinon.assert.notCalled(mockLogger.debug); // Should not log again
    });

    it("should handle headers with array values (taking the first)", () => {
      const headersArray: http.IncomingHttpHeaders = {
        "x-ratelimit-limit": ["5000", "6000"],
        "x-ratelimit-remaining": ["4998"],
        "x-ratelimit-reset": [
          resetTimeFuture.toString(),
          (resetTimeFuture + 100).toString(),
        ],
      };
      rateLimitManager.updateFromHeaders(headersArray);
      const info = rateLimitManager.getRateLimitInfo();
      expect(info).to.deep.equal({
        limit: 5000,
        remaining: 4998,
        reset: resetTimeFuture,
      });
    });

    it("should not update if headers are missing required fields", () => {
      rateLimitManager.updateFromHeaders(headersMissing);
      expect(rateLimitManager.getRateLimitInfo()).to.be.null;
      sinon.assert.notCalled(mockLogger.debug); // No update logged
      sinon.assert.notCalled(mockLogger.warn); // No warning if never updated before
    });

    it("should log a warning if headers are missing after initial update", () => {
      rateLimitManager.updateFromHeaders(headersOk); // Initial valid update
      mockLogger.debug.resetHistory();
      rateLimitManager.updateFromHeaders(headersMissing); // Subsequent missing headers
      expect(rateLimitManager.getRateLimitInfo()).to.deep.equal({
        // State remains unchanged
        limit: 5000,
        remaining: 4999,
        reset: resetTimeFuture,
      });
      sinon.assert.notCalled(mockLogger.debug);
      sinon.assert.calledOnce(mockLogger.warn); // Should warn now
    });
  });

  describe("isLimitExceeded", () => {
    it("should return false if rate limit info is null", () => {
      expect(rateLimitManager.isLimitExceeded()).to.be.false;
    });

    it("should return false if remaining > 0", () => {
      rateLimitManager.updateFromHeaders(headersOk);
      expect(rateLimitManager.isLimitExceeded()).to.be.false;
    });

    it("should return true if remaining is 0 and reset time is in the future", () => {
      rateLimitManager.updateFromHeaders(headersLimited);
      // Ensure fake time is before reset time
      clock.setSystemTime(new Date((resetTimeFuture - 10) * 1000));
      expect(rateLimitManager.isLimitExceeded()).to.be.true;
    });

    it("should return false if remaining is 0 but reset time is in the past", () => {
      rateLimitManager.updateFromHeaders(headersLimitedPastReset);
      // Ensure fake time is after reset time
      clock.setSystemTime(new Date((resetTimePast + 10) * 1000));
      expect(rateLimitManager.isLimitExceeded()).to.be.false;
    });

    it("should return false if remaining is 0 and current time is exactly reset time", () => {
      rateLimitManager.updateFromHeaders(headersLimited);
      clock.setSystemTime(new Date(resetTimeFuture * 1000));
      expect(rateLimitManager.isLimitExceeded()).to.be.false; // Limit is reset *at* the reset time
    });
  });

  describe("getRateLimitInfo", () => {
    it("should return null initially", () => {
      expect(rateLimitManager.getRateLimitInfo()).to.be.null;
    });

    it("should return the current rate limit info after update", () => {
      rateLimitManager.updateFromHeaders(headersOk);
      const expectedInfo: GithubRateLimit = {
        limit: 5000,
        remaining: 4999,
        reset: resetTimeFuture,
      };
      expect(rateLimitManager.getRateLimitInfo()).to.deep.equal(expectedInfo);
    });
  });

  describe("getResetTime", () => {
    it("should return null initially", () => {
      expect(rateLimitManager.getResetTime()).to.be.null;
    });

    it("should return the correct reset Date object after update", () => {
      rateLimitManager.updateFromHeaders(headersOk);
      const expectedDate = new Date(resetTimeFuture * 1000);
      expect(rateLimitManager.getResetTime()).to.deep.equal(expectedDate);
    });
  });
});
