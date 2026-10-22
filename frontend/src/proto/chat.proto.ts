import protobuf from "protobufjs";

const protoDefinition = `
syntax = "proto3";
package chat;

message SendMessageProto {
  string conversationId = 1;
  string receiverId = 2;
  string text = 3;
}

message ChatMessageProto {
  string id = 1;
  string conversationId = 2;
  string senderId = 3;
  string receiverId = 4;
  string text = 5;
  string createdAt = 6;
  string readAt = 7;
}

message TypingEventProto {
  string conversationId = 1;
  string userId = 2;
  bool isTyping = 3;
  string receiverId = 4;
}

message PresenceEventProto {
  string userId = 1;
  bool isOnline = 2;
  repeated string onlineUserIds = 3;
}

message MessageReadProto {
  string conversationId = 1;
  string readerId = 2;
  string readAt = 3;
}
`;

export const protoRoot = protobuf.parse(protoDefinition).root;

export const SendMessageProto = protoRoot.lookupType("chat.SendMessageProto");
export const ChatMessageProto = protoRoot.lookupType("chat.ChatMessageProto");
export const TypingEventProto = protoRoot.lookupType("chat.TypingEventProto");
export const PresenceEventProto = protoRoot.lookupType("chat.PresenceEventProto");
export const MessageReadProto = protoRoot.lookupType("chat.MessageReadProto");
