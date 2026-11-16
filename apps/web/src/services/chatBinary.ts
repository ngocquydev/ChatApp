import { ChatMessageProto, SendMessageProto } from "@/proto/chat.proto";

interface LocationPayload {
  latitude: number;
  longitude: number;
  address?: string;
  name?: string;
  isLive?: boolean;
  liveExpiresAt?: string | null;
  isLiveActive?: boolean;
}

export function encodeSendMessage(message: {
  conversationId: string;
  receiverId: string;
  text: string;
  type?: string;
  location?: LocationPayload;
}): Uint8Array {
  return SendMessageProto.encode({
    ...message,
    location: message.location
      ? { ...message.location, liveExpiresAt: message.location.liveExpiresAt ?? undefined }
      : undefined,
  }).finish();
}

export function decodeChatMessage(payload: ArrayBuffer | Uint8Array) {
  const bytes = payload instanceof ArrayBuffer ? new Uint8Array(payload) : payload;
  const message = ChatMessageProto.toObject(ChatMessageProto.decode(bytes), {
    defaults: true,
  });
  return {
    _id: String(message.id),
    id: String(message.id),
    conversationId: String(message.conversationId),
    senderId: String(message.senderId),
    receiverId: message.receiverId ? String(message.receiverId) : null,
    text: String(message.text),
    createdAt: String(message.createdAt),
    readAt: message.readAt ? String(message.readAt) : null,
    type: String(message.type || "text"),
    location: message.location || null,
    callLog: message.callLog || null,
    isDeleted: Boolean(message.isDeleted),
  };
}
