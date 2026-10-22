import mqtt, { MqttClient } from "mqtt";
import {
  SendMessageProto,
  ChatMessageProto,
  TypingEventProto,
  PresenceEventProto,
  MessageReadProto,
} from "../proto/chat.proto";

export interface BinaryChatMessage {
  _id: string;
  id?: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: string;
  readAt?: string;
}

export interface BinaryTypingEvent {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export interface BinaryPresenceEvent {
  userId: string;
  isOnline: boolean;
  onlineUserIds: string[];
}

export interface BinarySeenEvent {
  conversationId: string;
  readerId: string;
  readAt: string;
}

type MessageHandler = (message: BinaryChatMessage) => void;
type TypingHandler = (event: BinaryTypingEvent) => void;
type PresenceHandler = (event: BinaryPresenceEvent) => void;
type SeenHandler = (event: BinarySeenEvent) => void;

class MqttChatClient {
  private client: MqttClient | null = null;
  private isConnected = false;
  private currentUserId: string | null = null;

  // Listeners
  private messageHandlers = new Set<MessageHandler>();
  private typingHandlers = new Set<TypingHandler>();
  private presenceHandlers = new Set<PresenceHandler>();
  private seenHandlers = new Set<SeenHandler>();

  /**
   * Kết nối tới MQTT over WebSocket Broker sử dụng Protocol Buffers
   */
  public connect(token: string, userId: string) {
    if (this.client && this.isConnected && this.currentUserId === userId) {
      return;
    }

    if (this.client) {
      this.client.end(true);
      this.client = null;
    }

    this.currentUserId = userId;

    const mqttUrl =
      process.env.NEXT_PUBLIC_MQTT_URL || "ws://localhost:1884";

    const clientId = `web_${userId}_${Math.random().toString(16).slice(2, 8)}`;

    
    this.client = mqtt.connect(mqttUrl, {
      clientId,
      username: userId,
      password: token || undefined,
      protocolVersion: 4,
      clean: true,
      reconnectPeriod: 3000,
      connectTimeout: 10000,
    });

    this.client.on("connect", () => {
      this.isConnected = true;
     

      // Subscribe topic tin nhắn cá nhân
      this.client?.subscribe(`chat/user/${userId}`, { qos: 1 }, (err) => {
        if (err) console.error("Lỗi subscribe chat/user:", err);
      });

      // Subscribe topic typing cá nhân
      this.client?.subscribe(`chat/user/${userId}/typing`, { qos: 0 });

      // Subscribe topic đã xem cá nhân
      this.client?.subscribe(`chat/user/${userId}/seen`, { qos: 1 });

      // Subscribe topic presence
      this.client?.subscribe("chat/presence", { qos: 0 });
    });

    this.client.on("message", (topic, payload) => {
      try {
        const uint8Payload = new Uint8Array(payload);

        // 1. Nhận tin nhắn mới (Binary ChatMessageProto)
        if (topic === `chat/user/${userId}`) {
          const decoded = ChatMessageProto.decode(uint8Payload) as any;
          const msgObj: BinaryChatMessage = {
            _id: decoded.id,
            id: decoded.id,
            conversationId: decoded.conversationId,
            senderId: decoded.senderId,
            receiverId: decoded.receiverId,
            text: decoded.text,
            createdAt: decoded.createdAt,
            readAt: decoded.readAt || undefined,
          };
       
          this.messageHandlers.forEach((handler) => handler(msgObj));
        }

        // 2. Nhận sự kiện Typing (Binary TypingEventProto)
        else if (topic === `chat/user/${userId}/typing`) {
          const decoded = TypingEventProto.decode(uint8Payload) as any;
          const typingObj: BinaryTypingEvent = {
            conversationId: decoded.conversationId,
            userId: decoded.userId,
            isTyping: Boolean(decoded.isTyping),
          };
          this.typingHandlers.forEach((handler) => handler(typingObj));
        }

        // 3. Nhận sự kiện Seen (Binary MessageReadProto)
        else if (topic === `chat/user/${userId}/seen`) {
          const decoded = MessageReadProto.decode(uint8Payload) as any;
          const seenObj: BinarySeenEvent = {
            conversationId: decoded.conversationId,
            readerId: decoded.readerId,
            readAt: decoded.readAt,
          };
          this.seenHandlers.forEach((handler) => handler(seenObj));
        }

        // 4. Nhận sự kiện Presence (Binary PresenceEventProto)
        else if (topic === "chat/presence") {
          const decoded = PresenceEventProto.decode(uint8Payload) as any;
          const presenceObj: BinaryPresenceEvent = {
            userId: decoded.userId,
            isOnline: Boolean(decoded.isOnline),
            onlineUserIds: Array.isArray(decoded.onlineUserIds)
              ? decoded.onlineUserIds
              : [],
          };
          this.presenceHandlers.forEach((handler) => handler(presenceObj));
        }
      } catch (err) {
        console.error(
          `[MQTT] Lỗi giải mã Binary Protocol Buffers từ topic ${topic}:`,
          err
        );
      }
    });

    this.client.on("error", (err) => {
      console.warn("⚠️ [MQTT] Lỗi kết nối MQTT:", err.message);
    });

    this.client.on("offline", () => {
      this.isConnected = false;
      console.log("ℹ️ [MQTT] Mất kết nối MQTT Broker");
    });
  }

  /**
   * Gửi tin nhắn bằng Protocol Buffers nhị phân qua MQTT
   */
  public sendMessage(conversationId: string, receiverId: string, text: string) {
    if (!this.client || !this.isConnected) {
      console.warn(
        "MQTT chưa kết nối, bỏ qua hoặc chuyển tiếp qua socket fallback"
      );
      return false;
    }

    try {
      // Đóng gói payload thành Uint8Array nhị phân
      const binaryPayload = SendMessageProto.encode({
        conversationId,
        receiverId,
        text: text.trim(),
      }).finish();

      console.log(
        `🚀 [MQTT BINARY SEND] Gửi gói tin Protobuf (${binaryPayload.byteLength} bytes) tới topic 'chat/send'`
      );

      this.client.publish(
        "chat/send",
        binaryPayload as unknown as Buffer,
        { qos: 1 },
        (err) => {
          if (err) console.error("Lỗi khi publish chat/send:", err);
        }
      );
      return true;
    } catch (err) {
      console.error("Lỗi đóng gói SendMessageProto:", err);
      return false;
    }
  }

  /**
   * Bắn sự kiện Typing nhị phân
   */
  public sendTyping(
    conversationId: string,
    receiverId: string,
    isTyping: boolean
  ) {
    if (!this.client || !this.isConnected) return;

    try {
      const binaryPayload = TypingEventProto.encode({
        conversationId,
        userId: this.currentUserId || "",
        receiverId,
        isTyping,
      }).finish();

      this.client.publish(
        "chat/typing",
        binaryPayload as unknown as Buffer,
        { qos: 0 }
      );
    } catch (err) {
      console.error("Lỗi gửi typing nhị phân:", err);
    }
  }

  /**
   * Báo đã đọc (Seen) nhị phân
   */
  public sendRead(conversationId: string, receiverId: string) {
    if (!this.client || !this.isConnected) return;

    try {
      const binaryPayload = MessageReadProto.encode({
        conversationId,
        readerId: this.currentUserId || "",
        readAt: new Date().toISOString(),
      }).finish();

      this.client.publish(
        "chat/read",
        binaryPayload as unknown as Buffer,
        { qos: 1 }
      );
    } catch (err) {
      console.error("Lỗi gửi read nhị phân:", err);
    }
  }

  // Đăng ký nhận tin nhắn
  public onMessage(handler: MessageHandler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  // Đăng ký nhận typing
  public onTyping(handler: TypingHandler) {
    this.typingHandlers.add(handler);
    return () => this.typingHandlers.delete(handler);
  }

  // Đăng ký nhận presence
  public onPresence(handler: PresenceHandler) {
    this.presenceHandlers.add(handler);
    return () => this.presenceHandlers.delete(handler);
  }

  // Đăng ký nhận seen
  public onSeen(handler: SeenHandler) {
    this.seenHandlers.add(handler);
    return () => this.seenHandlers.delete(handler);
  }

  public getIsConnected() {
    return this.isConnected;
  }

  public disconnect() {
    if (this.client) {
      this.client.end(true);
      this.client = null;
      this.isConnected = false;
      this.currentUserId = null;
    }
  }
}

export const mqttChatClient = new MqttChatClient();
