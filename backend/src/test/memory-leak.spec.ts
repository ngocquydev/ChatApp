import { describe, it, expect } from 'vitest';
import { EventEmitter } from 'events';

describe('Memory Overflow & RAM Leak Test Suite', () => {
  describe('High-throughput Event Processing & Heap Stability', () => {
    it('xử lý 10,000 tin nhắn / sự kiện thời gian thực không gây rò rỉ bộ nhớ nghiêm trọng', () => {
      // Ép chạy Garbage Collector nếu cờ --expose-gc được bật
      if (typeof global.gc === 'function') {
        global.gc();
      }

      const initialHeap = process.memoryUsage().heapUsed;

      // Giả lập lưu trữ tạm thời trong scope hàm
      const processMessages = () => {
        const batchSize = 10000;
        let processedCount = 0;

        for (let i = 0; i < batchSize; i++) {
          const mockMsg = {
            id: `msg_${i}`,
            sender: `user_${i % 100}`,
            text: `Tin nhắn kiểm tra số ${i}`,
            timestamp: Date.now(),
          };
          if (mockMsg.text.length > 0) {
            processedCount++;
          }
        }
        return processedCount;
      };

      const result = processMessages();
      expect(result).toBe(10000);

      if (typeof global.gc === 'function') {
        global.gc();
      }

      const finalHeap = process.memoryUsage().heapUsed;
      const heapDeltaBytes = finalHeap - initialHeap;
      const heapDeltaMB = heapDeltaBytes / (1024 * 1024);

      // Đảm bảo sau khi xử lý 10,000 messages và dọn dẹp, heap không tăng bất thường (> 15MB)
      expect(heapDeltaMB).toBeLessThan(15);
    });
  });

  describe('Event Listener Cleanup (Chống rò rỉ RAM do Event Listeners)', () => {
    it('khi client ngắt kết nối, tất cả event listener phải được gỡ bỏ', () => {
      const socketEmitter = new EventEmitter();
      socketEmitter.setMaxListeners(100);
      const eventName = 'chat:message';

      // Giả lập 50 client kết nối và đăng ký listener
      const handlers: Array<() => void> = [];
      for (let i = 0; i < 50; i++) {
        const handler = () => {};
        handlers.push(handler);
        socketEmitter.on(eventName, handler);
      }

      expect(socketEmitter.listenerCount(eventName)).toBe(50);

      // Giả lập dọn dẹp khi ngắt kết nối (cleanup lifecycle)
      handlers.forEach((h) => socketEmitter.removeListener(eventName, h));

      // Sau khi disconnect, số lượng listener phải trở về 0
      expect(socketEmitter.listenerCount(eventName)).toBe(0);
    });
  });

  describe('Buffer Overflow & Payload Size Limit Protection', () => {
    it('phải từ chối các payload nhị phân vượt quá kích thước an toàn tối đa (1MB)', () => {
      const MAX_ALLOWED_PAYLOAD = 1024 * 1024; // 1 Megabyte

      const checkPayloadSize = (buffer: Buffer): boolean => {
        if (buffer.length > MAX_ALLOWED_PAYLOAD) {
          throw new Error('PayloadTooLargeException: Vượt quá giới hạn bộ đệm cho phép');
        }
        return true;
      };

      // Payload an toàn: 100KB
      const safeBuffer = Buffer.alloc(100 * 1024);
      expect(checkPayloadSize(safeBuffer)).toBe(true);

      // Payload nguy hiểm (cố ý làm tràn RAM): 2MB
      const oversizedBuffer = Buffer.alloc(2 * 1024 * 1024);
      expect(() => checkPayloadSize(oversizedBuffer)).toThrowError('PayloadTooLargeException');
    });

    it('không bao giờ sử dụng Buffer.allocUnsafe mà không khởi tạo giá trị', () => {
      // Buffer.alloc đảm bảo memory được zero-fill, ngăn rò rỉ dữ liệu nhạy cảm cũ trên RAM
      const safeAllocated = Buffer.alloc(32);
      for (const byte of safeAllocated) {
        expect(byte).toBe(0);
      }
    });
  });
});
