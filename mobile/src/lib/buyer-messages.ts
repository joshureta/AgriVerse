import { apiRequest } from './api';

export type BuyerConversation = {
  id: number;
  buyer_id: string;
  created_at: string;
  last_message_at: string | null;
  buyer_last_seen_at: string | null;
  admin_last_seen_at: string | null;
  buyer_typing_at: string | null;
  admin_typing_at: string | null;
};

export type BuyerChatMessage = {
  id: number;
  conversation_id: number;
  sender_id: string;
  sender_role: 'buyer' | 'admin';
  body: string;
  created_at: string;
  read_at: string | null;
};

export type BuyerChatPresence = {
  online: boolean;
  last_seen_at?: string | null;
  is_typing?: boolean;
};

export async function loadBuyerMessages(): Promise<{
  conversation: BuyerConversation | null;
  messages: BuyerChatMessage[];
  presence: BuyerChatPresence;
}> {
  const body = await apiRequest<{
    conversation: BuyerConversation | null;
    messages: BuyerChatMessage[];
    presence: BuyerChatPresence;
  }>('/api/buyer/messages');
  return { conversation: body.conversation, messages: body.messages || [], presence: body.presence };
}

export async function loadBuyerUnreadCount(): Promise<number> {
  const body = await apiRequest<{ unread_count: number }>('/api/buyer/messages/unread-count');
  return body.unread_count || 0;
}

export async function sendBuyerMessage(text: string): Promise<{
  conversation: BuyerConversation;
  message: BuyerChatMessage;
  presence: BuyerChatPresence;
}> {
  const body = await apiRequest<{
    conversation: BuyerConversation;
    message: BuyerChatMessage;
    presence: BuyerChatPresence;
  }>('/api/buyer/messages', {
    method: 'POST',
    body: JSON.stringify({ body: text }),
  });
  return { conversation: body.conversation, message: body.message, presence: body.presence };
}

export async function setBuyerTyping(isTyping: boolean): Promise<void> {
  await apiRequest('/api/buyer/messages/typing', {
    method: 'POST',
    body: JSON.stringify({ is_typing: isTyping }),
  });
}
