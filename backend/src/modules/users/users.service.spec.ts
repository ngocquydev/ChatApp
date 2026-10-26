import { Test, TestingModule } from '@nestjs/testing';
import { RequestTimeoutException } from '@nestjs/common';
import { Types } from 'mongoose';
import { vi } from 'vitest';
import { UsersService } from './users.service.js';
import { getModelToken } from '@nestjs/mongoose';
import { User } from './entities/user.entity.js';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: {} },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

describe('UsersService.searchUsersPage (phân trang theo con trỏ)', () => {
  const makeDocs = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ _id: new Types.ObjectId(), name: `User ${i}` }));

  /** Mock chuỗi find().select().sort().limit().maxTimeMS().exec() và ghi lại tham số */
  const makeService = (result: unknown[] | Error) => {
    const calls: Record<string, unknown> = {};
    const chain: {
      select: ReturnType<typeof vi.fn>;
      sort: ReturnType<typeof vi.fn>;
      limit: ReturnType<typeof vi.fn>;
      maxTimeMS: ReturnType<typeof vi.fn>;
      exec: ReturnType<typeof vi.fn>;
    } = {
      select: vi.fn().mockReturnThis(),
      sort: vi.fn((arg) => ((calls.sort = arg), chain)),
      limit: vi.fn((arg) => ((calls.limit = arg), chain)),
      maxTimeMS: vi.fn((arg) => ((calls.maxTimeMS = arg), chain)),
      exec: vi.fn(() => (result instanceof Error ? Promise.reject(result) : Promise.resolve(result))),
    };
    const model = { find: vi.fn((q) => ((calls.query = q), chain)) };
    return { service: new UsersService(model as unknown as never), calls };
  };

  it('lấy dư 1 bản ghi: đủ trang + còn dữ liệu → hasMore = true và cắt về đúng limit', async () => {
    const { service, calls } = makeService(makeDocs(6));
    const res = await service.searchUsersPage('an', undefined, { limit: 5 });
    expect(calls.limit).toBe(6);
    expect(res.users).toHaveLength(5);
    expect(res.hasMore).toBe(true);
  });

  it('trang cuối (ít hơn limit+1 bản ghi) → hasMore = false', async () => {
    const { service } = makeService(makeDocs(3));
    const res = await service.searchUsersPage('an', undefined, { limit: 5 });
    expect(res.users).toHaveLength(3);
    expect(res.hasMore).toBe(false);
  });

  it('có con trỏ `after` → lọc _id > after, loại trừ chính mình, sắp xếp theo _id', async () => {
    const after = new Types.ObjectId().toString();
    const me = new Types.ObjectId().toString();
    const { service, calls } = makeService([]);
    await service.searchUsersPage('an', me, { after });
    const idFilter = (calls.query as Record<string, Record<string, Types.ObjectId>>)._id;
    expect(idFilter.$gt.toString()).toBe(after);
    expect(idFilter.$ne.toString()).toBe(me);
    expect(calls.sort).toEqual({ _id: 1 });
  });

  it('kẹp limit trong [1, 50] và mặc định 20', async () => {
    const a = makeService([]);
    await a.service.searchUsersPage('an', undefined, { limit: 999 });
    expect(a.calls.limit).toBe(51);
    const b = makeService([]);
    await b.service.searchUsersPage('an');
    expect(b.calls.limit).toBe(21);
  });

  it('luôn đặt maxTimeMS để chặn truy vấn quét quá lâu', async () => {
    const { service, calls } = makeService([]);
    await service.searchUsersPage('an');
    expect(calls.maxTimeMS).toBeGreaterThan(0);
  });

  it('MongoDB hết thời gian (code 50) → RequestTimeoutException thân thiện', async () => {
    const { service } = makeService(Object.assign(new Error('operation exceeded time limit'), { code: 50 }));
    await expect(service.searchUsersPage('zzqxj')).rejects.toBeInstanceOf(RequestTimeoutException);
  });

  it('ký tự đặc biệt regex trong từ khóa được escape', async () => {
    const { service, calls } = makeService([]);
    await service.searchUsersPage('a.*(b');
    const query = calls.query as { name: { $regex: string } };
    expect(query.name.$regex).toBe('a\\.\\*\\(b');
  });
});
