export interface QueuedAction {
  id: string;
  endpoint: string;
  method: string;
  body?: unknown;
  queuedAt: number;
}

const QUEUE_KEY = "zv_offline_queue";
const MAX_QUEUED = 50;

export function queueAction(action: Omit<QueuedAction, "id" | "queuedAt">): void {
  try {
    const pending: QueuedAction[] = JSON.parse(
      localStorage.getItem(QUEUE_KEY) || "[]"
    );
    if (pending.length >= MAX_QUEUED) return;
    // Deduplicate: remove existing action with same endpoint+method (prevents toggle thrashing)
    const deduped = pending.filter(
      (a) => !(a.endpoint === action.endpoint && a.method === action.method)
    );
    deduped.push({
      ...action,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      queuedAt: Date.now(),
    });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(deduped));
  } catch {
    // localStorage unavailable
  }
}

export function getPendingCount(): number {
  try {
    const pending: QueuedAction[] = JSON.parse(
      localStorage.getItem(QUEUE_KEY) || "[]"
    );
    return pending.length;
  } catch {
    return 0;
  }
}

export async function flushQueue(): Promise<number> {
  let synced = 0;
  try {
    const pending: QueuedAction[] = JSON.parse(
      localStorage.getItem(QUEUE_KEY) || "[]"
    );
    if (pending.length === 0) return 0;

    const remaining: QueuedAction[] = [];
    for (const action of pending) {
      try {
        const res = await fetch(action.endpoint, {
          method: action.method,
          headers: action.body
            ? { "Content-Type": "application/json" }
            : undefined,
          body: action.body ? JSON.stringify(action.body) : undefined,
        });
        if (res.ok) {
          synced++;
        } else {
          remaining.push(action);
        }
      } catch {
        remaining.push(action);
      }
      // Rate limit: 300ms between requests
      await new Promise((r) => setTimeout(r, 300));
    }
    localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  } catch {
    // silent
  }
  return synced;
}
