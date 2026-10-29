import AuthGuard from "@/components/common/AuthGuard";
import Explore from "@/components/pages/Explore";

export default function ExplorePage() {
  return (
    <AuthGuard>
      <Explore />
    </AuthGuard>
  );
}

