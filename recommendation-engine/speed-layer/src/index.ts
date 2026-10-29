import { RealTimeRecommenderService } from './services/real-time-recommender.service';
import { KafkaSpeedConsumer } from './kafka/consumer';

async function bootstrap() {
  console.log('=====================================================');
  console.log('  KHỞI ĐỘNG REAL-TIME SPEED LAYER (KAFKA + REDIS)    ');
  console.log('=====================================================');

  const recommenderService = new RealTimeRecommenderService();
  const consumer = new KafkaSpeedConsumer(recommenderService);

  const shutdown = async (signal: string) => {
    console.log(`\n[System] Nhận tín hiệu ${signal}. Đang đóng ứng dụng an toàn...`);
    try {
      await consumer.stop();
      await recommenderService.close();
      console.log('[System] Đã đóng tài nguyên. Tạm biệt!');
      process.exit(0);
    } catch (err) {
      console.error('[System] Lỗi khi đóng tài nguyên:', err);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  await consumer.start();
}

bootstrap().catch((err) => {
  console.error('[Bootstrap] Lỗi không thể khởi động Speed Layer:', err);
  process.exit(1);
});
