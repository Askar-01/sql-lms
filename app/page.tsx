"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@/utils/supabase/client";

type ModuleItem = {
  id: number;
  title: string;
  description: string | null;
  order_no: number;
  lessons_count?: number;
};

export default function Home() {
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadModules = async () => {
      const supabase = createBrowserClient();

      const { data, error } = await supabase
        .from("modules")
        .select(`
          id,
          title,
          description,
          order_no,
          lessons:lessons(count)
        `)
        .eq("is_published", true)
        .order("order_no", { ascending: true });

      if (error) {
        console.error("Supabase error:", error.message);
      } else {
        const formatted =
          data?.map((item: any) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            order_no: item.order_no,
            lessons_count: item.lessons?.[0]?.count ?? 0,
          })) || [];

        setModules(formatted);
      }

      setLoading(false);
    };

    loadModules();
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-md p-8 mb-8 text-center">
          <h1 className="text-4xl font-bold text-slate-800 mb-4">
            SQL Mini-LMS
          </h1>
          <p className="text-lg text-slate-600">
            7-sinf uchun ma&apos;lumotlar bazasi va SQL kursi
          </p>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-slate-800">
            Kurs modullari
          </h2>
        </div>

        {loading ? (
          <p className="text-slate-600">Yuklanmoqda...</p>
        ) : modules.length === 0 ? (
          <p className="text-red-600">Modullar topilmadi.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {modules.map((item) => (
              <Link key={item.id} href={`/modules/${item.id}`}>
                <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-200 hover:shadow-lg transition cursor-pointer">
                  <h3 className="text-xl font-bold text-slate-800 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-slate-600 mb-3">{item.description}</p>
                  <p className="text-sm text-emerald-700 font-medium mb-2">
                    Darslar soni: {item.lessons_count}
                  </p>
                  <p className="text-sm text-blue-600 font-medium">
                    Modulgа o‘tish →
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}