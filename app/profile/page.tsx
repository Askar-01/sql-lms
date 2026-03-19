"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/utils/supabase/client";

type ProfileItem = {
  id: string;
  full_name: string | null;
  role: "student" | "teacher" | "admin";
  class_name: string | null;
  created_at: string;
};

export default function ProfilePage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<ProfileItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createBrowserClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setLoading(false);
        return;
      }

      setEmail(user.email || "");

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, role, class_name, created_at")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error(profileError.message);
      } else {
        setProfile(profileData);
      }

      setLoading(false);
    };

    loadProfile();
  }, []);

  const handleLogout = async () => {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push("/auth");
  };

  const getDashboardLink = () => {
    if (!profile) return "/dashboard";
    if (profile.role === "teacher") return "/teacher";
    if (profile.role === "admin") return "/admin";
    return "/student";
  };

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex gap-4">
          <Link href="/" className="text-blue-600 font-medium">
            ← Bosh sahifa
          </Link>
          <Link href="/auth" className="text-blue-600 font-medium">
            ← Auth sahifasi
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-6">
            Profil
          </h1>

          {loading ? (
            <p className="text-slate-600">Yuklanmoqda...</p>
          ) : !profile ? (
            <div>
              <p className="text-red-600 mb-4">
                Profil topilmadi yoki tizimga kirmagansiz.
              </p>
              <Link
                href="/auth"
                className="inline-block rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
              >
                Auth sahifasiga o‘tish
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-4 text-slate-700 mb-8">
                <p>
                  <span className="font-semibold">Email:</span> {email}
                </p>
                <p>
                  <span className="font-semibold">F.I.Sh.:</span>{" "}
                  {profile.full_name || "Ko‘rsatilmagan"}
                </p>
                <p>
                  <span className="font-semibold">Rol:</span> {profile.role}
                </p>
                <p>
                  <span className="font-semibold">Sinf:</span>{" "}
                  {profile.class_name || "Ko‘rsatilmagan"}
                </p>
                <p>
                  <span className="font-semibold">Yaratilgan:</span>{" "}
                  {new Date(profile.created_at).toLocaleString()}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={getDashboardLink()}
                  className="inline-block rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
                >
                  Kabinetga o‘tish
                </Link>

                <button
                  onClick={handleLogout}
                  className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white"
                >
                  Chiqish
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}