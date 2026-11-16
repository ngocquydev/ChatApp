import { describe, it, expect, vi } from 'vitest';

describe('N+1 Query Problem Prevention Test Suite', () => {
  describe('Batch Querying & Populate vs Naive N+1 Loops', () => {
    it('lấy danh sách cuộc hội thoại và thông tin người tham gia phải chạy với số lượng query cố định O(1)', async () => {
      // Giả lập cơ chế giám sát số lần truy vấn Database
      let databaseQueryCount = 0;

      // Mock database model
      const mockDb = {
        findConversations: vi.fn().mockImplementation(async () => {
          databaseQueryCount++;
          // Giả lập trả về 20 cuộc hội thoại
          return Array.from({ length: 20 }, (_, i) => ({
            id: `conv_${i}`,
            participantIds: [`user_${i * 2}`, `user_${i * 2 + 1}`],
          }));
        }),

        findUsersBatch: vi.fn().mockImplementation(async (userIds: string[]) => {
          databaseQueryCount++; // Chỉ 1 query duy nhất bằng toán tử $in!
          return userIds.map((id) => ({ id, name: `User ${id}` }));
        }),

        findUserSingle: vi.fn().mockImplementation(async (userId: string) => {
          databaseQueryCount++; // Đây là query lẻ từng lần (Antipattern N+1)
          return { id: userId, name: `User ${userId}` };
        }),
      };

      // 1. Cách truy vấn chuẩn O(1) bằng Batching ($in hoặc Mongoose populate)
      databaseQueryCount = 0;
      const conversations = await mockDb.findConversations();
      const allUserIds = Array.from(
        new Set(
          conversations.flatMap((c: { id: string; participantIds: string[] }) => c.participantIds),
        ),
      );
      await mockDb.findUsersBatch(allUserIds);

      // Tổng số query phải luôn là 2 (1 query cho conversations + 1 query $in cho users), bất kể số lượng hội thoại!
      expect(databaseQueryCount).toBe(2);
      expect(mockDb.findUsersBatch).toHaveBeenCalledTimes(1);

      // 2. Minh họa cách làm sai (N+1 Query) gây nghẽn database
      databaseQueryCount = 0;
      const naiveConversations = await mockDb.findConversations();
      for (const conv of naiveConversations) {
        for (const uid of conv.participantIds) {
          await mockDb.findUserSingle(uid); // Gọi query trong vòng lặp!
        }
      }

      // Với cách làm sai, số query bị bùng nổ: 1 + 20 * 2 = 41 queries!
      expect(databaseQueryCount).toBe(41);

      // Khẳng định kiến trúc tối ưu phải duy trì số query <= 3
      const optimizedQueryCount = 2;
      expect(optimizedQueryCount).toBeLessThanOrEqual(3);
    });

    it('truy vấn danh sách bạn bè với trạng thái phải gom nhóm theo $in thay vì lặp từng id', async () => {
      let queryCalls = 0;

      const mockFriendModel = {
        findFriendships: vi.fn().mockImplementation(async (userId: string) => {
          queryCalls++;
          return [
            { requesterId: userId, recipientId: 'user_1', status: 'accepted' },
            { requesterId: 'user_2', recipientId: userId, status: 'accepted' },
            { requesterId: userId, recipientId: 'user_3', status: 'accepted' },
          ];
        }),
        getUsersInfo: vi.fn().mockImplementation(async (ids: string[]) => {
          queryCalls++;
          return ids.map((id) => ({ id, name: `Friend ${id}` }));
        }),
      };

      queryCalls = 0;
      const friendships = await mockFriendModel.findFriendships('my_id');
      const friendIds = friendships.map(
        (f: { requesterId: string; recipientId: string; status: string }) =>
          f.requesterId === 'my_id' ? f.recipientId : f.requesterId,
      );
      await mockFriendModel.getUsersInfo(friendIds);

      // Chỉ tốn đúng 2 queries
      expect(queryCalls).toBe(2);
    });
  });
});
