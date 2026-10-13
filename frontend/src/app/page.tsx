import AuthGuard from "@/components/common/AuthGuard";
import Home from "@/components/pages/Home";

export default function Page() {
  return (
    <AuthGuard>
      <Home />
    </AuthGuard>
  );
}
