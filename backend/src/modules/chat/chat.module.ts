import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { Conversation, ConversationSchema } from './schemas/conversation.schema.js';
import { Message, MessageSchema } from './schemas/message.schema.js';
import { ChatService } from './chat.service.js';
import { ChatController } from './chat.controller.js';
import { ChatGateway } from './chat.gateway.js';
import { MqttBrokerService } from './mqtt-broker.service.js';
import { UsersModule } from '../users/users.module.js';
import { RedisModule } from '../redis/redis/redis.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'my_super_secret_key_chat_app',
      signOptions: { expiresIn: '1h' },
    }),
    UsersModule,
    RedisModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, MqttBrokerService],
  exports: [ChatService, ChatGateway, MqttBrokerService],
})
export class ChatModule {}
