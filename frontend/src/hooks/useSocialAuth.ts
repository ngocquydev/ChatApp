import { useRouter } from "next/navigation";
import { useAuthStore } from "../store/useAuthStore";

interface UseSocialAuthOptions {
  onSuccess?: () => void;
  onError?: (errorMessage: string) => void;
}

export const useSocialAuth = ({ onSuccess, onError }: UseSocialAuthOptions = {}) => {
  const router = useRouter();

  const {
    loginWithGoogle,
    loginWithFacebook,
    isGoogleLoading,
    isFacebookLoading,
  } = useAuthStore();

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/");
      }
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string; response?: { data?: { message?: string | string[] } } };
      if (
        error?.code === "auth/popup-closed-by-user" ||
        error?.code === "auth/cancelled-popup-request"
      ) {
        return;
      }

      let message = "Đăng nhập Google thất bại! Vui lòng thử lại.";
      if (error?.code === "auth/account-exists-with-different-credential") {
        message = "Email này đã được đăng ký";
      } else if (error?.response?.data?.message) {
        message = Array.isArray(error.response.data.message)
          ? error.response.data.message.join(", ")
          : error.response.data.message;
      } else if (error?.message) {
        message = error.message;
      }

      if (onError) {
        onError(message);
      }
    }
  };

  const handleFacebookLogin = async () => {
    try {
      await loginWithFacebook();
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/");
      }
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string; response?: { data?: { message?: string | string[] } } };
      if (
        error?.code === "auth/popup-closed-by-user" ||
        error?.code === "auth/cancelled-popup-request"
      ) {
        return;
      }

      let message = "Đăng nhập Facebook thất bại! Vui lòng thử lại.";
      if (error?.code === "auth/account-exists-with-different-credential") {
        message = "Email này đã được đăng ký";
      } else if (error?.response?.data?.message) {
        message = Array.isArray(error.response.data.message)
          ? error.response.data.message.join(", ")
          : error.response.data.message;
      } else if (error?.message) {
        message = error.message;
      }

      if (onError) {
        onError(message);
      }
    }
  };

  return {
    handleGoogleLogin,
    handleFacebookLogin,
    isGoogleLoading,
    isFacebookLoading,
  };
};

export default useSocialAuth;
