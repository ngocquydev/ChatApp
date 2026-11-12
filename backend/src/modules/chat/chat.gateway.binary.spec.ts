import { describe, expect, it, vi } from 'vitest';
import { ValidationPipe } from '@nestjs/common';
import { ChatGateway } from './chat.gateway.js';
import { SendMessageProto, ChatMessageProto } from './proto/chat.proto.js';

describe('binary chat gateway', () => {
  it('passes a Socket.IO binary packet through the global validation pipe and delivers it to both users', async () => {
    const senderId = '507f1f77bcf86cd799439011';
    const receiverId = '507f1f77bcf86cd799439012';
    const conversationId = '507f1f77bcf86cd799439013';
    const messageId = '507f1f77bcf86cd799439014';
    const packet = Buffer.from(SendMessageProto.encode({
      conversationId,
      receiverId,
      text: 'Chào bạn',
      type: 'text',
    }).finish());
    const parameterTypes = Reflect.getMetadata(
      'design:paramtypes',
      ChatGateway.prototype,
      'handleBinaryMessage',
    ) as unknown[];
    const pipe = new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      stopAtFirstError: true,
    });
    const payload = await pipe.transform(packet, {
      type: 'body',
      metatype: parameterTypes[1] as typeof Buffer,
    });

    const saveMessage = vi.fn().mockResolvedValue({
      _id: messageId,
      conversationId,
      senderId,
      receiverId,
      text: 'Chào bạn',
      type: 'text',
      createdAt: new Date('2026-11-12T00:00:00.000Z'),
    });
    const emit = vi.fn();
    const rooms: string[] = [];
    const room = { to: (name: string) => { rooms.push(name); return room; }, emit };
    const gateway = new ChatGateway(
      { saveMessage } as never,
      {} as never,
      {} as never,
    );
    gateway.server = { to: room.to } as never;

    const result = await gateway.handleBinaryMessage(
      { data: { user: { sub: senderId } } } as never,
      payload as Buffer,
    );

    expect(result.success).toBe(true);
    expect(saveMessage).toHaveBeenCalledWith(senderId, receiverId, 'Chào bạn', conversationId, {
      type: 'text',
      location: undefined,
    });
    expect(rooms).toEqual([`user:${senderId}`, `user:${receiverId}`]);
    const [event, encoded] = emit.mock.calls[0] as [string, Buffer];
    expect(event).toBe('message:new:binary');
    expect(Buffer.isBuffer(encoded)).toBe(true);
    expect(ChatMessageProto.toObject(ChatMessageProto.decode(encoded))).toMatchObject({
      id: messageId,
      senderId,
      receiverId,
      text: 'Chào bạn',
    });
  });
});
