import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { GetMessagesQueryDto, RestrictConversationDto } from './chat-request.dto.js';

describe('Chat request validation', () => {
  it('rejects invalid message limits and cursors', async () => {
    const dto = plainToInstance(GetMessagesQueryDto, { limit: 'NaN', before: 'bad-id' });
    expect(await validate(dto)).toHaveLength(2);
  });

  it('rejects a string instead of a boolean restriction flag', async () => {
    const dto = plainToInstance(RestrictConversationDto, { restrict: 'false' });
    expect(await validate(dto)).toHaveLength(1);
  });
});
