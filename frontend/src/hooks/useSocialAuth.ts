import { useRouter } from "next/navigation";
import { useAuthStore } from "../store/useAuthStore";
import { useTranslation } from "@/i18n/useTranslation";
import api from "@/services/api";

const FIREBASE_CONFIG_CODES = new Set([
  "auth/invalid-api-key",
  "auth/app-not-authorized",
  "auth/unauthorized-domain",
  "auth/operation-not-allowed",
  "auth/invalid-auth-domain",
]);

function reportFirebaseConfigError(provider: "google" | "facebook", code?: string) {
  if (!code || !FIREBASE_CONFIG_CODES.has(code)) return;
  void api.post("/auth/client-diagnostic", { provider, code }).catch(() => {
    // Authentication must still show a safe error when diagnostics are unavailable.
  });
}

interface UseSocialAuthOptions {
  onSuccess?: () => void;
  onError?: (errorMessage: string) => void;
}

export const useSocialAuth = ({ onSuccess, onError }: UseSocialAuthOptions = {}) => {
  const router = useRouter();
  const { tr } = useTranslation();

  const {
    loginWithGoogle,
    loginWithFacebook,
    isGoogleLoading,
    isFacebookLoading,
  } = useAuthStore();

  const redirectAfterLogin = () => {
    const user = useAuthStore.getState().user;
    const searchParams =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : null;
    const redirect = searchParams?.get("redirect");

    if (redirect) {
      router.push(redirect);
    } else if (user?.role === "admin") {
      router.push("/admin");
    } else {
      router.push("/");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      if (onSuccess) {
        onSuccess();
      } else {
        redirectAfterLogin();
      }
    } catch (err: unknown) {
      const error = err as { code?: string; response?: { data?: { message?: string | string[] } } };
      reportFirebaseConfigError("google", error?.code);
      if (
        error?.code === "auth/popup-closed-by-user" ||
        error?.code === "auth/cancelled-popup-request"
      ) {
        return;
      }

      let message = tr("Đăng nhập Google thất bại! Vui lòng thử lại.", "Google sign-in failed! Please try again.");
      if (error?.code === "auth/account-exists-with-different-credential") {
        message = tr("Email này đã được đăng ký", "This email is already registered");
      } else if (error?.response?.data?.message) {
        message = Array.isArray(error.response.data.message)
          ? error.response.data.message.join(", ")
          : error.response.data.message;
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
        redirectAfterLogin();
      }
    } catch (err: unknown) {
      const error = err as { code?: string; response?: { data?: { message?: string | string[] } } };
      reportFirebaseConfigError("facebook", error?.code);
      if (
        error?.code === "auth/popup-closed-by-user" ||
        error?.code === "auth/cancelled-popup-request"
      ) {
        return;
      }

      let message = tr("Đăng nhập Facebook thất bại! Vui lòng thử lại.", "Facebook sign-in failed! Please try again.");
      if (error?.code === "auth/account-exists-with-different-credential") {
        message = tr("Email này đã được đăng ký", "This email is already registered");
      } else if (error?.response?.data?.message) {
        message = Array.isArray(error.response.data.message)
          ? error.response.data.message.join(", ")
          : error.response.data.message;
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
