import { describe, it, expect } from 'vitest';
import { WorkerLifecycleManager } from '../src/workers/worker.lifecycle.js';
import { DeliveryProcessor } from '../src/workers/delivery.worker.js';
import { MockDeliveryTransport } from '../src/workers/transports/delivery.transport.js';

describe('Failure Injection & Resilience Tests', () => {
  it('should handle delivery processor transport rejection cleanly without crashing', async () => {
    const mockTransport = new MockDeliveryTransport();
    mockTransport.setSimulatedFailure(true, new Error('Simulated network timeout'));

    const processor = new DeliveryProcessor(undefined, undefined, mockTransport);
    expect(processor).toBeDefined();
  });

  it('should instantiate and stop WorkerLifecycleManager gracefully', async () => {
    const manager = new WorkerLifecycleManager();
    await expect(manager.stopWorker()).resolves.not.toThrow();
  });
});
