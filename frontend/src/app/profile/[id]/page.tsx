import type { Metadata } from "next";
import { redirect } from "next/navigation";
import UserProfile from "@/components/pages/UserProfile";
import JsonLd from "@/components/seo/JsonLd";
import { AURA_BOT_ID } from "@/constants/auraBot";

interface PageProps {
  params: Promise<{ id: string }>;
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://chatapp.vn";
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface ProfileResponse {
  user?: {
    _id: string;
    name: string;
    avatar?: string;
    cover?: string;
    bio?: string;
    createdAt?: string;
  };
  friendCount?: number;
}

async function getProfileData(id: string): Promise<ProfileResponse | null> {
  try {
    const safeId = encodeURIComponent(id.trim());
    const res = await fetch(`${apiUrl}/friends/profile/${safeId}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as ProfileResponse;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  if (id === AURA_BOT_ID) {
    return {
      title: "Aura AI",
      description: "Trợ lý ảo thông minh ChatApp",
    };
  }
  const profile = await getProfileData(id);

  if (!profile?.user) {
    return {
      title: "Trang cá nhân",
      description: "Xem hồ sơ người dùng trên ChatApp",
    };
  }

  const user = profile.user;
  const title = user.name;
  const description =
    user.bio ||
    `Xem hồ sơ của ${user.name} với ${profile.friendCount || 0} bạn bè trên ChatApp.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${siteUrl}/profile/${id}`,
    },
    openGraph: {
      title: `${user.name} | ChatApp`,
      description,
      url: `${siteUrl}/profile/${id}`,
      type: "profile",
      images: user.avatar
        ? [
            {
              url: user.avatar,
              width: 300,
              height: 300,
              alt: user.name,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary",
      title: `${user.name} | ChatApp`,
      description,
      images: user.avatar ? [user.avatar] : undefined,
    },
  };
}

export default async function UserProfilePage({ params }: PageProps) {
  const { id } = await params;
  if (id === AURA_BOT_ID) {
    redirect("/chat");
  }
  const profile = await getProfileData(id);

  const personStructuredData = profile?.user
    ? {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        mainEntity: {
          "@type": "Person",
          name: profile.user.name,
          identifier: id,
          description: profile.user.bio || undefined,
          image: profile.user.avatar || undefined,
          url: `${siteUrl}/profile/${id}`,
        },
      }
    : null;

  return (
    <>
      {personStructuredData && <JsonLd data={personStructuredData} />}
      <UserProfile userId={id} />
    </>
  );
}
