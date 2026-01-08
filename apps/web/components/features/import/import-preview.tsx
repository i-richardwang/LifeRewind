'use client';

import { format } from 'date-fns';
import { MessageSquare, Calendar, Bot } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  ScrollArea,
} from '@workspace/ui';
import type { ParsedConversation } from '@/lib/parsers/chatgpt';

interface ImportPreviewProps {
  conversations: ParsedConversation[];
  errors: string[];
}

export function ImportPreview({ conversations, errors }: ImportPreviewProps) {
  const totalMessages = conversations.reduce(
    (sum, conv) => sum + conv.messageCount,
    0
  );

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex flex-wrap items-center gap-4">
        <Badge variant="secondary" className="text-sm">
          {conversations.length} conversations
        </Badge>
        <Badge variant="outline" className="text-sm">
          {totalMessages} messages
        </Badge>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-destructive">
              {errors.length} conversations skipped
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {errors.slice(0, 5).map((error, i) => (
                <li key={i}>{error}</li>
              ))}
              {errors.length > 5 && (
                <li>...and {errors.length - 5} more</li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Conversation list */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Conversations to import</CardTitle>
          <CardDescription>
            Review the conversations that will be imported
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[300px]">
            <div className="divide-y">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {conv.title}
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="size-3" />
                        {conv.messageCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        {format(conv.createdAt, 'MMM d, yyyy')}
                      </span>
                      {conv.model && (
                        <span className="flex items-center gap-1">
                          <Bot className="size-3" />
                          {conv.model}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
