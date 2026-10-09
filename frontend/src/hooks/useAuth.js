import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuthStore } from "../store/useAuthStore";

export const useAuth = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    // Hàm gọi API thực tế
    mutationFn: async (credentials) => {
      const res = await api.post("/login", credentials);
      return res.data;
    },

    // Xử lý khi đăng nhập thành công
    onSuccess: (data) => {
      // Lưu thông tin user & token vào Zustand store
      setAuth(data.user, data.token);

      navigate("/");
    },

    // Xử lý khi xảy ra lỗi
    onError: (error) => {
      console.error(
        "Lỗi đăng nhập:",
        error.response?.data?.message || error.message,
      );
    },
  });
};
