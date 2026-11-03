import { BaseMessage, OffscreenPingMessage, OffscreenPongMessage } from './types';

/**
 * Generate a unique correlation ID for asynchronous message matching
 */
export function generateMessageId(prefix = 'msg'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Send typed message via chrome.runtime.sendMessage with timeout protection
 */
export async function sendMessage<TResponse extends BaseMessage, TRequest extends BaseMessage = BaseMessage>(
  message: TRequest,
  timeoutMs = 15000
): Promise<TResponse> {
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
    throw new Error('Chrome runtime messaging API is unavailable');
  }

  const payload = {
    ...message,
    id: message.id || generateMessageId(),
    timestamp: message.timestamp || Date.now()
  };

  return new Promise((resolve, reject) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error(`Message timeout after ${timeoutMs}ms (action: ${payload.type}, id: ${payload.id})`));
      }
    }, timeoutMs);

    try {
      chrome.runtime.sendMessage(payload, (response: TResponse) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);

        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || 'Unknown runtime error'));
          return;
        }

        if (!response) {
          reject(new Error(`No response received for message ${payload.type}`));
          return;
        }

        if (response.id !== payload.id) {
          reject(new Error(`Response correlation mismatch for message ${payload.type}`));
          return;
        }

        resolve(response);
      });
    } catch (err) {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    }
  });
}

/**
 * Send typed message to a specific browser tab
 */
export async function sendToTab<TResponse extends BaseMessage, TRequest extends BaseMessage = BaseMessage>(
  tabId: number,
  message: TRequest,
  timeoutMs = 15000
): Promise<TResponse> {
  if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.tabs.sendMessage) {
    throw new Error('Chrome tabs messaging API is unavailable');
  }

  const payload = {
    ...message,
    id: message.id || generateMessageId(),
    timestamp: message.timestamp || Date.now()
  };

  return new Promise((resolve, reject) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error(`Tab message timeout after ${timeoutMs}ms (tab: ${tabId}, action: ${payload.type})`));
      }
    }, timeoutMs);

    try {
      chrome.tabs.sendMessage(tabId, payload, (response: TResponse) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);

        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || `Tab ${tabId} unavailable`));
          return;
        }

        if (!response) {
          reject(new Error(`No response received for tab message ${payload.type}`));
          return;
        }

        if (response.id !== payload.id) {
          reject(new Error(`Response correlation mismatch for tab message ${payload.type}`));
          return;
        }

        resolve(response);
      });
    } catch (err) {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    }
  });
}

/**
 * Send a ping to verify offscreen document readiness
 */
export async function pingOffscreen(timeoutMs = 5000): Promise<boolean> {
  try {
    const pingMessage: OffscreenPingMessage = {
      type: 'OFFSCREEN_PING',
      id: generateMessageId('ping')
    };

    const response = await sendMessage<OffscreenPongMessage, OffscreenPingMessage>(pingMessage, timeoutMs);
    return response.type === 'OFFSCREEN_PONG';
  } catch {
    return false;
  }
}
