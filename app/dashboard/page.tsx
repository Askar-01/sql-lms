"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/utils/supabase/client";

export default function DashboardRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const checkRole = async () => {
      const supabase = createBrowserClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (error || !profile) {
        router.push("/profile");
        return;
      }

      if (profile.role === "teacher") {
        router.push("/teacher");
        return;
      }

      if (profile.role === "admin") {
        router.push("/admin");
        return;
      }

      router.push("/student");
    };

    checkRole();
  }, [router]);

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-3xl mx-auto text-slate-600">
        Dashboard yo‘naltirilmoqda...
      </div>
    </main>
  );
}