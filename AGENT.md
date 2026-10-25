# AGENT.md — Chỉ thị bắt buộc: Tự động kiểm tra chất lượng & Đẩy lên Git

> **DÀNH CHO TẤT CẢ CÁC AI / AGENT LÀM VIỆC TRONG DỰ ÁN NÀY:**
> Khi nhận bất kỳ yêu cầu nào (thêm tính năng mới, sửa lỗi, chỉnh sửa giao diện hay cập nhật logic), **ngay sau khi viết xong code, AI BẮT BUỘC PHẢI TỰ ĐỘNG CHẠY KIỂM THỬ, COMMIT VÀ PUSH LÊN GIT TRƯỚC KHI TRẢ LỜI NGƯỜI DÙNG.**
> **TUYỆT ĐỐI KHÔNG DỪNG LẠI HỎI:** *"Bạn có muốn đẩy lên Git không?"* hay chờ người dùng nhắc *"đẩy lên git đi"*.

---

## ⚡ 1. NGUYÊN TẮC HOẠT ĐỘNG TỰ ĐỘNG (AUTONOMOUS EXECUTION)

Mỗi khi hoàn thành một nhiệm vụ hoặc chức năng:
1. **Không hỏi xin phép để kiểm thử:** Tự động chạy tất cả các lệnh kiểm tra chất lượng (Quality Gates).
2. **Không hỏi xin phép để commit và push:** Tự động phân chia commit chuẩn, chạy `git push origin main` và chờ pre-push hook hoàn tất.
3. **Nếu có lỗi khi kiểm tra hoặc push:** Tự động đọc log lỗi, sửa dứt điểm, kiểm tra lại và push cho đến khi thành công.
4. **Chỉ trả lời người dùng khi mã nguồn đã an toàn trên Git** kèm bằng chứng kiểm thử cụ thể.

---

## 🛡️ 2. QUY TRÌNH KIỂM CHẤT LƯỢNG BẮT BUỘC (QUALITY GATES)

Trước khi commit và push, AI phải chạy tuần tự các bước sau và đảm bảo **0 LỖI**:

### Bước 1: Kiểm tra Frontend
```powershell
cd frontend
npm run typecheck    # Bắt buộc: 0 lỗi TypeScript (tsc --noEmit)
npm run lint         # Bắt buộc: 0 lỗi ESLint (2 cảnh báo cũ ở FloatingChatBox là ngoại lệ đã biết)
```
*(Nếu có thay đổi route, layout hoặc nhiều component lớn: chạy thêm `npm run build` để kiểm tra bản build production).*

### Bước 2: Kiểm tra Backend
```powershell
cd backend
npm run typecheck    # Bắt buộc: 0 lỗi TypeScript
npm run lint         # Bắt buộc: 0 lỗi Oxlint
npx vitest run       # Bắt buộc: 100% tests PASSED
```

### Bước 3: Quét bảo mật, RAM, N+1 Query toàn repo
```powershell
# Chạy từ thư mục gốc d:\Web\chat
node scripts/ci-inspect.mjs    # Bắt buộc: Tất cả kiểm tra PASSED (OWASP, RAM leak, N+1 query)
```

> ⚠️ **Cấm hạ chuẩn chất lượng:** Tuyệt đối không dùng `@ts-ignore`, `eslint-disable`, không xóa test hay sửa hạ ngưỡng kiểm tra để đối phó với lỗi. Phải sửa đúng bản chất vấn đề.

---

## 🚀 3. QUY TRÌNH COMMIT & PUSH GIT TỰ ĐỘNG

Sau khi toàn bộ Quality Gates ở mục 2 đã xanh (PASSED):

1. **Kiểm tra trạng thái Git:**
   ```powershell
   git status --short
   ```
   *Lưu ý:* Không commit file tự sinh `frontend/next-env.d.ts` (nếu chỉ đổi giữa dev/build), không commit file `.env` thật hay dữ liệu trong thư mục upload tạm.

2. **Cập nhật tài liệu nếu có tính năng/API mới:**
   - Nếu thêm API mới hoặc tăng số lượng test: cập nhật ngay vào [README.md](./README.md) (bảng API, số lượng test passed, mục tính năng hoàn thành).

3. **Tạo Commit theo chuẩn Conventional Commits:**
   - Tách commit rõ ràng theo nhóm:
     + Backend: `feat(...)` hoặc `fix(...)`
     + Frontend: `feat(...)` hoặc `fix(...)`
     + Tài liệu / Hướng dẫn: `docs(...)` hoặc `chore(...)`

4. **Đẩy lên Git (Push to Remote):**
   ```powershell
   git push origin main
   ```
   *Lưu ý:* Git Pre-Push Hook (`.git/hooks/pre-push`) sẽ tự động chạy lại kiểm tra. Hãy chờ lệnh kết thúc và xác nhận nhánh `main -> main` đã được cập nhật thành công.

---

## 🎨 4. QUY TẮC CỐT LÕI VỀ CODE & UI/UX TRONG REPO

Khi viết mã nguồn, AI phải luôn tuân thủ các quy tắc trong [AGENTS.md](./AGENTS.md):
- **Không hard-code màu hex/rgba** trong component frontend (`src/**`). Phải dùng token từ `@/theme/tokens` hoặc biến `var(--mui-palette-...)`.
- **Hỗ trợ đầy đủ Dark Mode:** Mọi giao diện phải hiển thị chính xác cả sáng và tối.
- **Khả năng tiếp cận (Accessibility):** Các nút bấm chỉ có icon (`IconButton`) bắt buộc có `aria-label` bằng tiếng Việt. Phần tử click được phải là `Button`, `IconButton`, `ListItemButton`, `ButtonBase` hoặc `Link` (cấm `Box/div/Typography onClick`).
- **sx.borderRadius:** Dạng số bị nhân 12 (theo theme MUI v9), do đó luôn dùng chuỗi px: `"16px"`, `"12px"`, `"8px"`.
- **Bảo mật:** Token lưu trong HttpOnly Cookie; không lưu trữ dữ liệu nhạy cảm trong `localStorage`.

---

## 📋 5. NỘI DUNG BÁO CÁO CHO NGƯỜI DÙNG

Sau khi đã push xong mã nguồn lên Git, AI phản hồi ngắn gọn bằng tiếng Việt:
1. **Những gì đã thực hiện:** Tóm tắt chức năng vừa làm.
2. **Bằng chứng kiểm tra:** Liệt kê kết quả `typecheck`, `lint`, số lượng test `vitest` passed, và `ci-inspect.mjs`.
3. **Trạng thái Git:** Xác nhận các commit đã được push thành công lên `origin/main` kèm mã hash commit.
4. **Hướng dẫn người dùng:** Các điểm cần lưu ý hoặc hướng dẫn người dùng tự kiểm tra bằng mắt trên trình duyệt (nếu có liên quan tới UI/UX).
