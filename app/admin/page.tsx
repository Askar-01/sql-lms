"use client";

import Link from "next/link";

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex gap-4">
          <Link href="/" className="text-blue-600 font-medium">
            ← Bosh sahifa
          </Link>
          <Link href="/profile" className="text-blue-600 font-medium">
            ← Profil
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-8">
          <p className="text-sm text-rose-700 font-medium mb-3">Admin panel</p>
          <h1 className="text-3xl font-bold text-slate-800 mb-3">
            Admin kabineti
          </h1>
          <p className="text-slate-600">
            Bu yerda keyin user management, rollar, modullar va umumiy tizim boshqaruvi bo‘ladi.
          </p>
        </div>
      </div>
    </main>
  );
}