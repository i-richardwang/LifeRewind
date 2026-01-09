'use client';

import type {
  CollectedItem,
  GitData,
  BrowserData,
  FilesystemData,
  ChatbotData,
} from '@/db/schema';
import { GitDetail } from './git-detail';
import { BrowserDetail } from './browser-detail';
import { FilesystemDetail } from './filesystem-detail';
import { ChatbotDetail } from './chatbot-detail';

interface ItemDetailContentProps {
  item: CollectedItem;
}

export function ItemDetailContent({ item }: ItemDetailContentProps) {
  const { sourceType, data, timestamp } = item;

  switch (sourceType) {
    case 'git':
      return <GitDetail data={data as GitData} timestamp={timestamp} />;
    case 'browser':
      return (
        <BrowserDetail
          data={data as BrowserData}
          timestamp={timestamp}
          url={item.url}
        />
      );
    case 'filesystem':
      return <FilesystemDetail data={data as FilesystemData} timestamp={timestamp} />;
    case 'chatbot':
      return <ChatbotDetail data={data as ChatbotData} />;
    default:
      return (
        <div className="text-sm text-muted-foreground">
          Unknown source type: {sourceType}
        </div>
      );
  }
}
