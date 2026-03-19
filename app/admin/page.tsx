"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@/utils/supabase/client";

type ProfileItem = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: "student" | "teacher" | "admin";
  class_name: string | null;
  created_at: string;
};

function UserRow({
  user,
  onSaved,
}: {
  user: ProfileItem;
  onSaved: () => Promise<void>;
}) {
  const [role, setRole] = useState<"student" | "teacher" | "admin">(user.role);
  const [className, setClassName] = useState(user.class_name || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);

    const supabase = createBrowserClient();

    const { error } = await supabase
      .from("profiles")
      .update({
        role,
        class_name: className.trim() || null,
      })
      .eq("id", user.id);

    if (error) {
      console.error(error.message);
      setSaving(false);
      return;
    }

    await onSaved();
    setSaving(false);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-800">
          {user.full_name || "Nomsiz user"}
        </h3>
        <p className="text-sm text-slate-500">{user.email || "Email yo‘q"}</p>
        <p className="text-sm text-slate-500 mt-1">
          Yaratilgan: {new Date(user.created_at).toLocaleString()}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Rol
          </label>
          <select
            value={role}
            onChange={(e) =>
              setRole(e.target.value as "student" | "teacher" | "admin")
            }
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
          >
            <option value="student">student</option>
            <option value="teacher">teacher</option>
            <option value="admin">admin</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Sinf
          </label>
          <input
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            placeholder="Masalan: 12-A"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-4 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-70"
      >
        {saving ? "Saqlanmoqda..." : "O‘zgarishni saqlash"}
      </button>
    </div>
  );
}

export default function AdminPage() {
  const [me, setMe] = useState<ProfileItem | null>(null);
  const [users, setUsers] = useState<ProfileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  const loadUsers = async () => {
    const supabase = createBrowserClient();

    const {
  data: { session },
} = await supabase.auth.getSession();

const user = session?.user;
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: myProfile } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, class_name, created_at")
      .eq("id", user.id)
      .single();

    if (myProfile) {
      setMe(myProfile as ProfileItem);
    }

    const { data: profilesData, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, class_name, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error.message);
    } else {
      setUsers((profilesData || []) as ProfileItem[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = users.filter((item) => {
    if (!searchText.trim()) return true;

    const q = searchText.toLowerCase();
    return (
      (item.full_name || "").toLowerCase().includes(q) ||
      (item.email || "").toLowerCase().includes(q) ||
      (item.class_name || "").toLowerCase().includes(q) ||
      item.role.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="max-w-6xl mx-auto text-slate-600">Yuklanmoqda...</div>
      </main>
    );
  }

  if (!me) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-2xl bg-white p-8 shadow-md">
            <p className="text-red-600">Siz tizimga kirmagansiz.</p>
            <Link href="/auth" className="inline-block mt-4 text-blue-600 font-medium">
              Auth sahifasiga o‘tish
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (me.role !== "admin") {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-2xl bg-white p-8 shadow-md">
            <p className="text-red-600 font-medium">
              Bu sahifa faqat admin uchun.
            </p>
            <div className="mt-4 flex gap-4">
              <Link href="/" className="text-blue-600 font-medium">
                ← Bosh sahifa
              </Link>
              <Link href="/profile" className="text-blue-600 font-medium">
                ← Profil
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex gap-4">
          <Link href="/" className="text-blue-600 font-medium">
            ← Bosh sahifa
          </Link>
          <Link href="/profile" className="text-blue-600 font-medium">
            ← Profil
          </Link>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-md mb-8">
          <p className="text-sm text-rose-700 font-medium mb-3">Admin panel</p>
          <h1 className="text-3xl font-bold text-slate-800 mb-3">
            Foydalanuvchilar boshqaruvi
          </h1>
          <p className="text-slate-600">
            User role va sinf ma’lumotlarini shu yerda boshqarishingiz mumkin.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-md mb-8">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Qidirish
          </label>
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Ism, email, sinf yoki role bo‘yicha qidiring"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
          />
        </div>

        {filteredUsers.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 shadow-md text-slate-600">
            User topilmadi.
          </div>
        ) : (
          <div className="space-y-5">
            {filteredUsers.map((user) => (
              <UserRow key={user.id} user={user} onSaved={loadUsers} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}