import protobuf from 'protobufjs';

const protoDefinition = `
syntax = "proto3";
package chat;

message SendMessageProto {
  string conversationId = 1;
  string receiverId = 2;
  string text = 3;
  string type = 4;
  LocationProto location = 5;
}

message ChatMessageProto {
  string id = 1;
  string conversationId = 2;
  string senderId = 3;
  string receiverId = 4;
  string text = 5;
  string createdAt = 6;
  string readAt = 7;
  string type = 8;
  CallLogProto callLog = 9;
  LocationProto location = 10;
  bool isDeleted = 11;
}

message LocationProto {
  double latitude = 1;
  double longitude = 2;
  string address = 3;
  string name = 4;
  bool isLive = 5;
  string liveExpiresAt = 6;
  bool isLiveActive = 7;
}

message CallLogProto {
  string callType = 1;
  string status = 2;
  double duration = 3;
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

export const SendMessageProto = protoRoot.lookupType('chat.SendMessageProto');
export const ChatMessageProto = protoRoot.lookupType('chat.ChatMessageProto');
export const TypingEventProto = protoRoot.lookupType('chat.TypingEventProto');
export const PresenceEventProto = protoRoot.lookupType('chat.PresenceEventProto');
export const MessageReadProto = protoRoot.lookupType('chat.MessageReadProto');
