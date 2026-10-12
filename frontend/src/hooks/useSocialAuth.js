import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";


export const useSocialAuth = ({ onSuccess, onError } = {}) => {
  const navigate = useNavigate();

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
        navigate("/");
      }
    } catch (err) {
      // Người dùng chủ động đóng popup hoặc hủy bỏ -> không báo lỗi
      if (
        err.code === "auth/popup-closed-by-user" ||
        err.code === "auth/cancelled-popup-request"
      ) {
        return;
      }

      let message = "Đăng nhập Google thất bại! Vui lòng thử lại.";
      if (err.code === "auth/account-exists-with-different-credential") {
        message = "Email này đã được đăng ký";
      } else if (err.response?.data?.message) {
        message = Array.isArray(err.response.data.message)
          ? err.response.data.message.join(", ")
          : err.response.data.message;
      } else if (err.message) {
        message = err.message;
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
        navigate("/");
      }
    } catch (err) {
      if (
        err.code === "auth/popup-closed-by-user" ||
        err.code === "auth/cancelled-popup-request"
      ) {
        return;
      }

      let message = "Đăng nhập Facebook thất bại! Vui lòng thử lại.";
      if (err.code === "auth/account-exists-with-different-credential") {
        message = "Email này đã được đăng ký";
      } else if (err.response?.data?.message) {
        message = Array.isArray(err.response.data.message)
          ? err.response.data.message.join(", ")
          : err.response.data.message;
      } else if (err.message) {
        message = err.message;
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
