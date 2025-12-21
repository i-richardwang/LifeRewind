import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export type ChatbotClient = 'chatwise';

const CHATBOT_PATHS: Record<ChatbotClient, string> = {
  chatwise: join(homedir(), 'Library', 'Application Support', 'app.chatwise', 'app.db'),
};

export function detectChatbotClients(): ChatbotClient[] {
  const detected: ChatbotClient[] = [];

  for (const [client, path] of Object.entries(CHATBOT_PATHS)) {
    if (existsSync(path)) {
      detected.push(client as ChatbotClient);
    }
  }

  return detected;
}
