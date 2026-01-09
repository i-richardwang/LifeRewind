'use client';

import { format } from 'date-fns';
import { MessageSquare, User, Bot } from 'lucide-react';
import { Badge, Label, Separator } from '@workspace/ui';
import type { ChatbotData, ChatbotMessage } from '@/db/schema';

interface ChatbotDetailProps {
  data: ChatbotData;
}

const clientLabels: Record<string, string> = {
  chatwise: 'ChatWise',
  chatgpt: 'ChatGPT',
};

function MessageBubble({ message }: { message: ChatbotMessage }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="max-w-[90%] rounded-md bg-muted/50 px-3 py-2">
          <p className="break-words text-center text-xs text-muted-foreground">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`flex size-6 shrink-0 items-center justify-center rounded-full ${
          isUser ? 'bg-primary' : 'bg-muted'
        }`}
      >
        {isUser ? (
          <User className="size-3 text-primary-foreground" />
        ) : (
          <Bot className="size-3 text-muted-foreground" />
        )}
      </div>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 ${
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        }`}
      >
        <p className="whitespace-pre-wrap break-words text-sm">
          {message.content}
        </p>
        {message.model && (
          <p
            className={`mt-1 text-xs ${
              isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
            }`}
          >
            {message.model}
          </p>
        )}
      </div>
    </div>
  );
}

export function ChatbotDetail({ data }: ChatbotDetailProps) {
  const { client, model, messages } = data;

  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const firstMessageTime = sortedMessages[0]?.createdAt;
  const lastMessageTime = sortedMessages[sortedMessages.length - 1]?.createdAt;

  return (
    <div className="grid min-w-0 gap-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--chart-4)]/10">
          <MessageSquare className="size-5 text-[var(--chart-4)]" />
        </div>
        <div className="grid min-w-0 gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{clientLabels[client] || client}</Badge>
            {model && <Badge variant="secondary">{model}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {messages.length} messages
          </p>
        </div>
      </div>

      <Separator />

      {/* Session Info - StatsCard */}
      <div className="grid gap-3">
        <Label>Session Info</Label>
        <div className="rounded-md border bg-muted/50 p-3">
          <div className="grid gap-2">
            {firstMessageTime && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Started</span>
                <span>{format(new Date(firstMessageTime), 'HH:mm')}</span>
              </div>
            )}
            {lastMessageTime && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Last Reply</span>
                <span>{format(new Date(lastMessageTime), 'HH:mm')}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Messages</span>
              <Badge variant="secondary">{messages.length}</Badge>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Conversation - Native scroll for proper width context on message bubbles */}
      <div className="grid gap-3">
        <Label>Conversation</Label>
        <div className="h-64 overflow-y-auto rounded-md border bg-muted/50 p-3">
          <div className="space-y-3">
            {sortedMessages.map((message, index) => (
              <MessageBubble key={message.id || index} message={message} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
