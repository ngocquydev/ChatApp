export type NotifyType = "success" | "error" | "info";

/** Hiển thị toast thông báo ngắn cho người dùng. */
export type NotifyFn = (message: string, type?: NotifyType) => void;
