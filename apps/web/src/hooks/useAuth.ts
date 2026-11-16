import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import api from "../services/api";
import { useAuthStore, UserProfile } from "../store/useAuthStore";

interface LoginCredentials {
  email?: string;
  password?: string;
  [key: string]: unknown;
}

interface LoginResponse {
  user: UserProfile;
  token?: string;
  [key: string]: unknown;
}

export const useAuth = () => {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const res = await api.post<LoginResponse>("/login", credentials);
      return res.data;
    },

    onSuccess: (data) => {
      setAuth(data.user);
      router.push("/");
    },

    onError: (error: unknown) => {
      const err = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      console.error(
        "Lỗi đăng nhập:",
        err.response?.data?.message || err.message
      );
    },
  });
};

export default useAuth;
