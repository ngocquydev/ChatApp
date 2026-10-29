import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { config } from '../config/env';
import { RealTimeRecommenderService, FriendAcceptedEvent } from '../services/real-time-recommender.service';

export class KafkaSpeedConsumer {
  private kafka: Kafka;
  private consumer: Consumer;
  private recommenderService: RealTimeRecommenderService;
  private isRunning = false;

  constructor(recommenderService: RealTimeRecommenderService) {
    this.recommenderService = recommenderService;
    this.kafka = new Kafka({
      clientId: config.kafka.clientId,
      brokers: config.kafka.brokers,
      retry: {
        initialRetryTime: 300,
        retries: 8,
      },
    });

    this.consumer = this.kafka.consumer({
      groupId: config.kafka.groupId,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });
  }

  async start(): Promise<void> {
    try {
      console.log(`[Kafka] Đang kết nối tới brokers: ${config.kafka.brokers.join(', ')}...`);
      await this.consumer.connect();
      console.log(`[Kafka] Kết nối thành công! Đang lắng nghe topic '${config.kafka.topic}'...`);

      await this.consumer.subscribe({
        topic: config.kafka.topic,
        fromBeginning: false,
      });

      this.isRunning = true;

      await this.consumer.run({
        autoCommit: true,
        eachMessage: async (payload: EachMessagePayload) => {
          await this.processMessage(payload);
        },
      });
    } catch (error) {
      console.error('[Kafka] Lỗi khởi động Consumer:', error);
      throw error;
    }
  }

  private async processMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;
    if (!message.value) return;

    try {
      const rawText = message.value.toString('utf-8');
      const data = JSON.parse(rawText);

      // Kiểm tra event type hoặc payload chuẩn
      const isAcceptedEvent =
        !data.eventType ||
        data.eventType === 'FRIEND_ACCEPTED' ||
        data.event === 'friend:accepted';

      if (isAcceptedEvent && (data.userA || data.userId) && (data.userB || data.friendId)) {
        const event: FriendAcceptedEvent = {
          eventType: 'FRIEND_ACCEPTED',
          userA: data.userA || data.userId,
          userB: data.userB || data.friendId,
          timestamp: data.timestamp || Date.now(),
        };

        await this.recommenderService.handleFriendAccepted(event);
      }
    } catch (err) {
      console.error(
        `[Kafka] Lỗi xử lý message tại offset ${message.offset} (partition ${partition}, topic ${topic}):`,
        err,
      );
    }
  }

  async stop(): Promise<void> {
    if (this.isRunning) {
      this.isRunning = false;
      await this.consumer.disconnect();
      console.log('[Kafka] Consumer đã ngắt kết nối an toàn.');
    }
  }
}
