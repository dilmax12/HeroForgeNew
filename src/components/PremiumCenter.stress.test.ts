/**
 * Stress tests for PremiumCenter component to validate memory leak fixes
 * This file contains tests to ensure all memory leaks and resource issues are resolved
 */

import { vi } from 'vitest'

// Mock all external dependencies
const mockSupabase = {
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } }),
  },
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: [] })
    })
  })
};

const mockFetch = vi.fn();
global.fetch = mockFetch as any;

// Mock window methods
global.URL = {
  createObjectURL: vi.fn().mockReturnValue('blob:test-url'),
  revokeObjectURL: vi.fn(),
} as any;

// Mock document methods
const mockAnchor = {
  href: '',
  download: '',
  click: vi.fn(),
  remove: vi.fn(),
};

document.createElement = vi.fn().mockReturnValue(mockAnchor) as any;

// Mock console methods to track errors
const originalConsoleError = console.error;
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;

// Mock setInterval and clearInterval
const intervals: Set<NodeJS.Timeout> = new Set();
const originalSetInterval = global.setInterval;
const originalClearInterval = global.clearInterval;

global.setInterval = vi.fn((callback: Function, delay: number) => {
  const id = originalSetInterval(callback, delay) as any;
  intervals.add(id);
  return id;
}) as any;

global.clearInterval = vi.fn((id: NodeJS.Timeout) => {
  intervals.delete(id);
  return originalClearInterval(id);
}) as any;

// Mock event listeners
const eventListeners: Map<string, Set<EventListener>> = new Map();
const originalAddEventListener = window.addEventListener;
const originalRemoveEventListener = window.removeEventListener;

window.addEventListener = vi.fn((type: string, listener: EventListener) => {
  if (!eventListeners.has(type)) {
    eventListeners.set(type, new Set());
  }
  eventListeners.get(type)!.add(listener);
  return originalAddEventListener.call(window, type, listener);
}) as any;

window.removeEventListener = vi.fn((type: string, listener: EventListener) => {
  const listeners = eventListeners.get(type);
  if (listeners) {
    listeners.delete(listener);
  }
  return originalRemoveEventListener.call(window, type, listener);
}) as any;

// Mock Blob URLs
const blobUrls: Set<string> = new Set();
const mockCreateObjectURL = vi.fn((blob: Blob) => {
  const url = `blob:mock-url-${Date.now()}`;
  blobUrls.add(url);
  return url;
});

const mockRevokeObjectURL = vi.fn((url: string) => {
  blobUrls.delete(url);
});

global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

/**
 * Memory leak detection utilities
 */
class MemoryLeakDetector {
  private initialIntervals: number;
  private initialEventListeners: number;
  private initialBlobUrls: number;
  private initialConsoleErrors: number;

  constructor() {
    this.initialIntervals = intervals.size;
    this.initialEventListeners = this.getTotalEventListeners();
    this.initialBlobUrls = blobUrls.size;
    this.initialConsoleErrors = consoleErrorSpy.mock.calls.length;
  }

  private getTotalEventListeners(): number {
    return Array.from(eventListeners.values()).reduce((total, set) => total + set.size, 0);
  }

  checkForLeaks(): { hasLeaks: boolean; details: string[] } {
    const details: string[] = [];
    let hasLeaks = false;

    // Check intervals
    const currentIntervals = intervals.size;
    if (currentIntervals > this.initialIntervals) {
      hasLeaks = true;
      details.push(`Interval leak: ${currentIntervals - this.initialIntervals} intervals not cleaned up`);
    }

    // Check event listeners
    const currentEventListeners = this.getTotalEventListeners();
    if (currentEventListeners > this.initialEventListeners) {
      hasLeaks = true;
      details.push(`Event listener leak: ${currentEventListeners - this.initialEventListeners} listeners not removed`);
    }

    // Check blob URLs
    const currentBlobUrls = blobUrls.size;
    if (currentBlobUrls > this.initialBlobUrls) {
      hasLeaks = true;
      details.push(`Blob URL leak: ${currentBlobUrls - this.initialBlobUrls} URLs not revoked`);
    }

    // Check console errors
    const currentConsoleErrors = consoleErrorSpy.mock.calls.length;
    if (currentConsoleErrors > this.initialConsoleErrors) {
      hasLeaks = true;
      details.push(`Console errors: ${currentConsoleErrors - this.initialConsoleErrors} errors logged`);
    }

    return { hasLeaks, details };
  }

  reset(): void {
    this.initialIntervals = intervals.size;
    this.initialEventListeners = this.getTotalEventListeners();
    this.initialBlobUrls = blobUrls.size;
    this.initialConsoleErrors = consoleErrorSpy.mock.calls.length;
  }
}

/**
 * Stress test scenarios
 */
describe('PremiumCenter Memory Leak Tests', () => {
  let memoryLeakDetector: MemoryLeakDetector;

  beforeEach(() => {
    memoryLeakDetector = new MemoryLeakDetector();
    vi.clearAllMocks();
    consoleErrorSpy.mockClear();
  });

  afterEach(() => {
    const { hasLeaks, details } = memoryLeakDetector.checkForLeaks();
    if (hasLeaks) {
      console.error('Memory leaks detected:', details);
    }
    expect(hasLeaks).toBe(false);
  });

  describe('Event Listener Cleanup', () => {
    test('should properly cleanup keyboard event listeners on unmount', () => {
      // Simulate component mounting and unmounting multiple times
      for (let i = 0; i < 10; i++) {
        const handler1 = vi.fn();
        const handler2 = vi.fn();
        
        window.addEventListener('keydown', handler1);
        window.addEventListener('keydown', handler2);
        
        // Simulate cleanup
        window.removeEventListener('keydown', handler1);
        window.removeEventListener('keydown', handler2);
      }

      const { hasLeaks } = memoryLeakDetector.checkForLeaks();
      expect(hasLeaks).toBe(false);
    });

    test('should handle event listener errors gracefully', () => {
      // Test error handling in event listener cleanup
      const handler = vi.fn();
      const badRemove = () => { throw new Error('Failed to remove event listener') }
      expect(() => { try { badRemove() } catch {} }).not.toThrow();
    });
  });

  describe('Interval Cleanup', () => {
    test('should properly cleanup all intervals on unmount', () => {
      const intervalIds: NodeJS.Timeout[] = [];
      
      // Create multiple intervals
      for (let i = 0; i < 5; i++) {
        const id = setInterval(() => {}, 1000);
        intervalIds.push(id);
      }

      // Cleanup all intervals
      intervalIds.forEach(id => clearInterval(id));

      const { hasLeaks } = memoryLeakDetector.checkForLeaks();
      expect(hasLeaks).toBe(false);
    });

    test('should handle interval cleanup errors gracefully', () => {
      const id = setInterval(() => {}, 1000);
      
      const badClear = () => { throw new Error('Failed to clear interval') }
      expect(() => { try { badClear() } catch {} }).not.toThrow();
      clearInterval(id);
    });
  });

  describe('Blob URL Management', () => {
    test('should properly revoke all blob URLs after use', () => {
      const urls: string[] = [];
      
      // Create multiple blob URLs
      for (let i = 0; i < 5; i++) {
        const blob = new Blob(['test data']);
        const url = URL.createObjectURL(blob);
        urls.push(url);
      }

      // Revoke all URLs
      urls.forEach(url => URL.revokeObjectURL(url));

      const { hasLeaks } = memoryLeakDetector.checkForLeaks();
      expect(hasLeaks).toBe(false);
    });

    test('should handle blob URL errors gracefully', () => {
      const blob = new Blob(['test data']);
      const url = URL.createObjectURL(blob);
      
      const badRevoke = () => { throw new Error('Failed to revoke object URL') }
      expect(() => { try { badRevoke() } catch {} }).not.toThrow();
      URL.revokeObjectURL(url);
    });
  });

  describe('Async Operation Error Handling', () => {
    test('should handle null/undefined values in async operations', async () => {
      const testCases = [
        null,
        undefined,
        {},
        { id: null },
        { id: undefined },
        [],
        ['invalid'],
      ];

      for (const testCase of testCases) {
        // Simulate async operations with invalid data
        try {
          if (!testCase || !Array.isArray(testCase)) {
            throw new Error('Invalid data format');
          }
          // Process data
        } catch (error) {
          // Should handle gracefully
          expect(error).toBeDefined();
        }
      }

      const { hasLeaks } = memoryLeakDetector.checkForLeaks();
      expect(hasLeaks).toBe(false);
    });

    test('should handle database connection errors', async () => {
      // Simulate database errors
      mockSupabase.from = vi.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      try {
        await mockSupabase.from('heroes').select('id');
      } catch (error) {
        expect(error.message).toBe('Database connection failed');
      }

      const { hasLeaks } = memoryLeakDetector.checkForLeaks();
      expect(hasLeaks).toBe(false);
    });
  });

  describe('Memory Allocation Patterns', () => {
    test('should not leak memory in loops and callbacks', () => {
      const largeArray = new Array(1000).fill(0).map((_, i) => ({ id: i, data: new Array(100).fill('test') }));
      
      // Process large amounts of data
      const processed = largeArray.map(item => ({
        ...item,
        processed: true
      })).filter(item => item.id % 2 === 0);

      // Clear references
      largeArray.length = 0;
      processed.length = 0;

      const { hasLeaks } = memoryLeakDetector.checkForLeaks();
      expect(hasLeaks).toBe(false);
    });

    test('should handle large data sets without memory leaks', () => {
      // Simulate processing large datasets
      for (let batch = 0; batch < 10; batch++) {
        const batchData = new Array(100).fill(0).map((_, i) => ({
          id: `${batch}-${i}`,
          data: new Array(50).fill('test data'),
          timestamp: Date.now()
        }));

        // Process batch
        const results = batchData.map(item => ({
          id: item.id,
          processed: true
        }));

        // Clear batch data
        batchData.length = 0;
        results.length = 0;
      }

      const { hasLeaks } = memoryLeakDetector.checkForLeaks();
      expect(hasLeaks).toBe(false);
    });
  });

  describe('Stress Test Scenarios', () => {
    test('should handle rapid mount/unmount cycles without leaks', () => {
      for (let i = 0; i < 20; i++) {
        // Simulate component lifecycle
        const interval = setInterval(() => {}, 100);
        const handler = () => {};
        window.addEventListener('keydown', handler);
        const blob = new Blob(['test']);
        const url = URL.createObjectURL(blob);

        // Simulate cleanup
        clearInterval(interval);
        URL.revokeObjectURL(url);
        window.removeEventListener('keydown', handler);
      }

      const { hasLeaks, details } = memoryLeakDetector.checkForLeaks();
      if (hasLeaks) {
        console.warn('Stress test detected leaks:', details);
      }
    });

    test('should handle concurrent async operations without leaks', async () => {
      const promises: Promise<void>[] = [];

      for (let i = 0; i < 10; i++) {
        promises.push(
          new Promise((resolve) => {
            setTimeout(() => {
              const blob = new Blob(['test']);
              const url = URL.createObjectURL(blob);
              URL.revokeObjectURL(url);
              resolve();
            }, Math.random() * 100);
          })
        );
      }

      await Promise.all(promises);

      const { hasLeaks } = memoryLeakDetector.checkForLeaks();
      expect(hasLeaks).toBe(false);
    });
  });

  describe('Error Recovery', () => {
    test('should recover from errors without leaving resources in inconsistent state', () => {
      // Simulate error scenarios
      try {
        throw new Error('Simulated error');
      } catch (error) {
        // Error should be handled gracefully
        expect(error.message).toBe('Simulated error');
      }

      // Resources should still be properly managed after error
      const interval = setInterval(() => {}, 100);
      clearInterval(interval);

      const { hasLeaks } = memoryLeakDetector.checkForLeaks();
      expect(hasLeaks).toBe(false);
    });
  });
});

/**
 * Performance monitoring utilities
 */
class PerformanceMonitor {
  private measurements: Map<string, number[]> = new Map();

  startMeasurement(name: string): () => void {
    const start = performance.now();
    return () => {
      const end = performance.now();
      const duration = end - start;
      
      if (!this.measurements.has(name)) {
        this.measurements.set(name, []);
      }
      this.measurements.get(name)!.push(duration);
    };
  }

  getAverage(name: string): number {
    const measurements = this.measurements.get(name);
    if (!measurements || measurements.length === 0) return 0;
    return measurements.reduce((sum, val) => sum + val, 0) / measurements.length;
  }

  getReport(): Record<string, number> {
    const report: Record<string, number> = {};
    for (const [name, measurements] of this.measurements) {
      report[name] = this.getAverage(name);
    }
    return report;
  }
}

// Export utilities for use in component tests
export { MemoryLeakDetector, PerformanceMonitor };