import {
  ExtensionMessage,
  ConvertImageRequestMessage,
  ConvertImageResponseMessage,
  OffscreenPongMessage
} from '../utils/types';
import { convertImage } from './converter';
import { isWorkerSender, validMessage, validConversion } from '../utils/message-policy';

console.info('[Offscreen] Offscreen conversion document initialized.');

/**
 * Handle incoming IPC messages from Service Worker
 */
chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: any) => void
  ): boolean | void => {
    if (!isWorkerSender(sender) || !validMessage(message)) {
      return;
    }

    // Ping / Pong liveness probe
    if (message.type === 'OFFSCREEN_PING') {
      const pong: OffscreenPongMessage = {
        type: 'OFFSCREEN_PONG',
        id: message.id,
        timestamp: Date.now()
      };
      sendResponse(pong);
      return false; // synchronous response
    }

    // Image conversion request handler
    if (message.type === 'CONVERT_IMAGE_REQUEST') {
      if (!validConversion(message)) return false;
      handleConvertRequest(message as ConvertImageRequestMessage)
        .then((response) => sendResponse(response))
        .catch((error) => {
          console.error('[Offscreen] Conversion failed:', error);
          const failureResponse: ConvertImageResponseMessage = {
            type: 'CONVERT_IMAGE_RESPONSE',
            id: message.id,
            success: false,
            error: error instanceof Error ? error.message : String(error)
          };
          sendResponse(failureResponse);
        });
      return true; // asynchronous response
    }

    return false;
  }
);

/**
 * Execute client-side image conversion pipeline
 */
async function handleConvertRequest(
  request: ConvertImageRequestMessage
): Promise<ConvertImageResponseMessage> {
  console.info(`[Offscreen] Converting ${request.id} to ${request.targetFormat}`);

  const result = await convertImage(request);

  return {
    type: 'CONVERT_IMAGE_RESPONSE',
    id: request.id,
    success: true,
    dataUrl: result.dataUrl,
    mimeType: result.mimeType,
    byteLength: result.byteLength,
    width: result.width,
    height: result.height
  };
}
