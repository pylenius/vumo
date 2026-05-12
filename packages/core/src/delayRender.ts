export interface DelayRenderHandle {
  readonly id: number;
  readonly label: string;
  readonly createdAt: number;
}

let nextHandleId = 0;
const pending = new Map<number, DelayRenderHandle>();

export function delayRender(label = 'unnamed'): number {
  const id = nextHandleId++;
  pending.set(id, { id, label, createdAt: Date.now() });
  return id;
}

export function continueRender(handle: number): void {
  pending.delete(handle);
}

export function getPendingRenderHandles(): readonly DelayRenderHandle[] {
  return Array.from(pending.values());
}

export function clearPendingRenderHandles(): void {
  pending.clear();
}
