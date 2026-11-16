import { describe, expect, it, vi } from 'vitest';
import { ChatController } from './chat.controller.js';
import { ChatGateway } from './chat.gateway.js';
import { ChatMessageProto } from './proto/chat.proto.js';

describe('REST chat fallback', () => {
  it('passes a validated history cursor and limit to the service', async () => {
    const getMessagesPage = vi.fn().mockResolvedValue({ messages: [], nextCursor: null, hasMore: false });
    const controller = new ChatController({ getMessagesPage } as never, {} as never);
    const conversationId = '507f1f77bcf86cd799439013';
    const userId = '507f1f77bcf86cd799439011';
    const before = '507f1f77bcf86cd799439014';

    await controller.getMessages({ user: { sub: userId } } as never, conversationId, { limit: 20, before });

    expect(getMessagesPage).toHaveBeenCalledWith(conversationId, userId, 20, before);
  });

  it('preserves false when removing a conversation restriction', async () => {
    const restrictConversation = vi.fn().mockResolvedValue({ restrictedBy: [] });
    const controller = new ChatController({ restrictConversation } as never, {} as never);

    await controller.restrictConversation(
      { user: { sub: '507f1f77bcf86cd799439011' } } as never,
      '507f1f77bcf86cd799439013',
      { restrict: false },
    );

    expect(restrictConversation).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439013',
      '507f1f77bcf86cd799439011',
      false,
    );
  });

  it('broadcasts the saved message to connected recipients', async () => {
    const message = {
      _id: '507f1f77bcf86cd799439014',
      conversationId: '507f1f77bcf86cd799439013',
      senderId: '507f1f77bcf86cd799439011',
      receiverId: '507f1f77bcf86cd799439012',
      text: 'Tin nhắn từ điện thoại',
      type: 'text',
      createdAt: new Date('2026-11-12T00:00:00.000Z'),
    };
    const saveMessage = vi.fn().mockResolvedValue(message);
    const emit = vi.fn();
    const rooms: string[] = [];
    const room = { to: (name: string) => { rooms.push(name); return room; }, emit };
    const gateway = new ChatGateway({} as never, {} as never, {} as never);
    gateway.server = { to: room.to } as never;
    vi.spyOn(gateway, 'triggerAuraReply').mockResolvedValue(undefined);
    const controller = new ChatController(
      { saveMessage } as never,
      gateway,
    );

    const result = await controller.sendMessage(
      { user: { sub: message.senderId } } as never,
      {
        receiverId: message.receiverId,
        conversationId: message.conversationId,
        text: message.text,
        type: 'text',
      },
    );

    expect(result.message).toBe(message);
    expect(rooms).toEqual([`user:${message.senderId}`, `user:${message.receiverId}`]);
    const [event, payload] = emit.mock.calls[0] as [string, Buffer];
    expect(event).toBe('message:new:binary');
    expect(ChatMessageProto.toObject(ChatMessageProto.decode(payload))).toMatchObject({
      id: message._id,
      senderId: message.senderId,
      receiverId: message.receiverId,
      text: message.text,
    });
  });
});
