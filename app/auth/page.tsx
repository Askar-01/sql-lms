"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createBrowserClient } from "@/utils/supabase/client";

export default function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setErrorText("");

    const supabase = createBrowserClient();

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role,
          },
        },
      });

      if (error) {
        setErrorText(error.message);
        setLoading(false);
        return;
      }

      if (data.session) {
        setMessage("Ro‘yxatdan o‘tish muvaffaqiyatli tugadi.");
        window.location.href = "/dashboard";
        return;
      } else {
        setMessage(
          "Ro‘yxatdan o‘tish muvaffaqiyatli. Email tasdiqlash yoqilgan bo‘lsa, pochtangizni tekshiring."
        );
        setLoading(false);
        return;
      }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorText(error.message);
      setLoading(false);
      return;
    }

    console.log("SIGN IN DATA:", data);
    setMessage("Tizimga kirildi.");
    window.location.href = "/profile";
  };

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <Link href="/" className="text-blue-600 font-medium">
            ← Bosh sahifa
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-8">
          <div className="flex gap-3 mb-6">
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`px-4 py-2 rounded-xl font-medium ${
                mode === "signup"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              Sign up
            </button>

            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`px-4 py-2 rounded-xl font-medium ${
                mode === "signin"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              Sign in
            </button>
          </div>

          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            {mode === "signup" ? "Ro‘yxatdan o‘tish" : "Tizimga kirish"}
          </h1>

          <p className="text-slate-600 mb-6">
            SQL Mini-LMS uchun akkaunt yarating yoki tizimga kiring.
          </p>

          {message && (
            <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-emerald-700">
              {message}
            </div>
          )}

          {errorText && (
            <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-red-700">
              {errorText}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    F.I.Sh.
                  </label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                    placeholder="Masalan: Asqar Janabaev"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Rol
                  </label>
                  <select
                    value={role}
                    onChange={(e) =>
                      setRole(e.target.value as "student" | "teacher")
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                  >
                    <option value="student">student</option>
                    <option value="teacher">teacher</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                placeholder="email@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Parol
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                placeholder="Kamida 6 ta belgi"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-70"
            >
              {loading
                ? "Yuklanmoqda..."
                : mode === "signup"
                ? "Ro‘yxatdan o‘tish"
                : "Kirish"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}