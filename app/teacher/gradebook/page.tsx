"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@/utils/supabase/client";
import * as XLSX from "xlsx";

type BsbSubmission = {
  id: number;
  student_name: string;
  student_class: string | null;
  teacher_score: number | null;
  status: "submitted" | "reviewed" | "returned";
  submitted_late: boolean;
  assessment_id: number;
};

type QuizAttempt = {
  id: number;
  student_name: string | null;
  student_class: string | null;
  percentage: number;
  earned_points: number;
  total_points: number;
  assessment_id: number;
  created_at: string;
};

type GradebookRow = {
  key: string;
  student_name: string;
  student_class: string | null;
  bsb_total: number;
  bsb_reviewed: number;
  bsb_average: number | null;
  chsb_total: number;
  chsb_best_percentage: number | null;
  chsb_average_percentage: number | null;
  late_count: number;
};

export default function TeacherGradebookPage() {
  const [bsbSubmissions, setBsbSubmissions] = useState<BsbSubmission[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    const loadData = async () => {
      const supabase = createBrowserClient();

      const { data: bsbData, error: bsbError } = await supabase
        .from("bsb_submissions")
        .select(
          "id, student_name, student_class, teacher_score, status, submitted_late, assessment_id"
        )
        .order("submitted_at", { ascending: false });

      if (bsbError) {
        console.error(bsbError.message);
      } else {
        setBsbSubmissions((bsbData || []) as BsbSubmission[]);
      }

      const { data: quizData, error: quizError } = await supabase
        .from("quiz_attempts")
        .select(
          "id, student_name, student_class, percentage, earned_points, total_points, assessment_id, created_at"
        )
        .order("created_at", { ascending: false });

      if (quizError) {
        console.error(quizError.message);
      } else {
        setQuizAttempts((quizData || []) as QuizAttempt[]);
      }

      setLoading(false);
    };

    loadData();
  }, []);

  const rows = useMemo(() => {
    const map = new Map<string, GradebookRow>();

    const ensureRow = (name: string | null, className: string | null) => {
      const finalName = name?.trim() || "Nomsiz user";
      const normalizedClass = className?.trim() || null;
      const key = `${finalName.toLowerCase()}__${(normalizedClass || "").toLowerCase()}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          student_name: finalName,
          student_class: normalizedClass,
          bsb_total: 0,
          bsb_reviewed: 0,
          bsb_average: null,
          chsb_total: 0,
          chsb_best_percentage: null,
          chsb_average_percentage: null,
          late_count: 0,
        });
      }

      return map.get(key)!;
    };

    for (const item of bsbSubmissions) {
      const row = ensureRow(item.student_name, item.student_class);
      row.bsb_total += 1;

      if (item.submitted_late) {
        row.late_count += 1;
      }

      if (item.teacher_score !== null) {
        row.bsb_reviewed += 1;
      }
    }

    for (const item of quizAttempts) {
      const row = ensureRow(item.student_name, item.student_class);
      row.chsb_total += 1;
    }

    for (const row of map.values()) {
      const relatedBsb = bsbSubmissions.filter((item) => {
        const itemName = item.student_name?.trim() || "Nomsiz user";
        const itemClass = item.student_class?.trim() || null;

        return (
          itemName.toLowerCase() === row.student_name.toLowerCase() &&
          itemClass === row.student_class &&
          item.teacher_score !== null
        );
      });

      if (relatedBsb.length > 0) {
        const sum = relatedBsb.reduce(
          (acc, item) => acc + Number(item.teacher_score || 0),
          0
        );
        row.bsb_average = Number((sum / relatedBsb.length).toFixed(2));
      }

      const relatedQuiz = quizAttempts.filter((item) => {
        const itemName = item.student_name?.trim() || "Nomsiz user";
        const itemClass = item.student_class?.trim() || null;

        return (
          itemName.toLowerCase() === row.student_name.toLowerCase() &&
          itemClass === row.student_class
        );
      });

      if (relatedQuiz.length > 0) {
        const percentages = relatedQuiz.map((item) => item.percentage);
        row.chsb_best_percentage = Math.max(...percentages);
        row.chsb_average_percentage = Number(
          (
            percentages.reduce((acc, val) => acc + val, 0) / percentages.length
          ).toFixed(1)
        );
      }
    }

    return Array.from(map.values()).sort((a, b) =>
      a.student_name.localeCompare(b.student_name)
    );
  }, [bsbSubmissions, quizAttempts]);

  const filteredRows = rows.filter((row) => {
    if (!searchText.trim()) return true;

    const q = searchText.toLowerCase();
    return (
      row.student_name.toLowerCase().includes(q) ||
      (row.student_class || "").toLowerCase().includes(q)
    );
  });

  const stats = useMemo(() => {
    return {
      students: rows.length,
      totalBsb: bsbSubmissions.length,
      totalChsb: quizAttempts.length,
    };
  }, [rows, bsbSubmissions, quizAttempts]);

  const exportCsv = () => {
    const headers = [
      "Oquvchi",
      "Sinf",
      "BSB soni",
      "BSB tekshirilgan",
      "BSB ortacha",
      "CHSB soni",
      "Eng yaxshi CHSB",
      "CHSB ortacha",
      "Late",
    ];

    const escapeCsv = (value: string | number | null) => {
      const text = value === null ? "" : String(value);
      return `"${text.replace(/"/g, '""')}"`;
    };

    const csvRows = filteredRows.map((row) => [
      row.student_name,
      row.student_class || "",
      row.bsb_total,
      row.bsb_reviewed,
      row.bsb_average ?? "",
      row.chsb_total,
      row.chsb_best_percentage !== null ? `${row.chsb_best_percentage}%` : "",
      row.chsb_average_percentage !== null ? `${row.chsb_average_percentage}%` : "",
      row.late_count,
    ]);

    const csvContent = [
      headers.map(escapeCsv).join(","),
      ...csvRows.map((row) => row.map((cell) => escapeCsv(cell)).join(",")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    const now = new Date();
    const filename = `gradebook_${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}.csv`;

    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportXlsx = () => {
    const data = filteredRows.map((row, index) => ({
      "T/r": index + 1,
      "O‘quvchi": row.student_name,
      "Sinf": row.student_class || "",
      "BSB soni": row.bsb_total,
      "BSB tekshirilgan": row.bsb_reviewed,
      "BSB o‘rtacha": row.bsb_average ?? "",
      "CHSB soni": row.chsb_total,
      "Eng yaxshi CHSB (%)":
        row.chsb_best_percentage !== null ? row.chsb_best_percentage : "",
      "CHSB o‘rtacha (%)":
        row.chsb_average_percentage !== null ? row.chsb_average_percentage : "",
      Late: row.late_count,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);

    worksheet["!cols"] = [
      { wch: 6 },
      { wch: 24 },
      { wch: 12 },
      { wch: 12 },
      { wch: 18 },
      { wch: 14 },
      { wch: 12 },
      { wch: 18 },
      { wch: 18 },
      { wch: 10 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Gradebook");

    const now = new Date();
    const filename = `gradebook_${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}.xlsx`;

    XLSX.writeFile(workbook, filename);
  };

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex gap-4">
          <Link href="/teacher" className="text-blue-600 font-medium">
            ← Teacher panel
          </Link>
          <Link href="/" className="text-blue-600 font-medium">
            ← Bosh sahifa
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-8 mb-8">
          <p className="text-sm text-emerald-700 font-medium mb-3">Gradebook</p>
          <h1 className="text-3xl font-bold text-slate-800 mb-3">
            O‘qituvchi jurnal sahifasi
          </h1>
          <p className="text-slate-600 mb-5">
            Bu yerda BSB va CHSB natijalari o‘quvchi kesimida umumlashtiriladi.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={exportCsv}
              className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white"
            >
              CSV ga eksport
            </button>

            <button
              onClick={exportXlsx}
              className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
            >
              Excel ga eksport
            </button>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl shadow-md p-8 text-slate-600">
            Yuklanmoqda...
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3 mb-8">
              <div className="bg-white rounded-2xl shadow-md p-6">
                <p className="text-sm text-slate-500 mb-2">O‘quvchilar</p>
                <p className="text-3xl font-bold text-slate-800">{stats.students}</p>
              </div>

              <div className="bg-white rounded-2xl shadow-md p-6">
                <p className="text-sm text-slate-500 mb-2">Jami BSB</p>
                <p className="text-3xl font-bold text-amber-600">{stats.totalBsb}</p>
              </div>

              <div className="bg-white rounded-2xl shadow-md p-6">
                <p className="text-sm text-slate-500 mb-2">Jami CHSB</p>
                <p className="text-3xl font-bold text-rose-600">{stats.totalChsb}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Qidirish
              </label>
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Ism yoki sinf bo‘yicha qidirish"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div className="bg-white rounded-2xl shadow-md p-4 overflow-x-auto">
              <table className="w-full min-w-[1000px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="p-3 text-sm font-semibold text-slate-700">O‘quvchi</th>
                    <th className="p-3 text-sm font-semibold text-slate-700">Sinf</th>
                    <th className="p-3 text-sm font-semibold text-slate-700">BSB soni</th>
                    <th className="p-3 text-sm font-semibold text-slate-700">BSB tekshirilgan</th>
                    <th className="p-3 text-sm font-semibold text-slate-700">BSB o‘rtacha</th>
                    <th className="p-3 text-sm font-semibold text-slate-700">CHSB soni</th>
                    <th className="p-3 text-sm font-semibold text-slate-700">Eng yaxshi CHSB</th>
                    <th className="p-3 text-sm font-semibold text-slate-700">CHSB o‘rtacha</th>
                    <th className="p-3 text-sm font-semibold text-slate-700">Late</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-6 text-slate-600">
                        Ma’lumot topilmadi.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => (
                      <tr key={row.key} className="border-b border-slate-100">
                        <td className="p-3 font-medium text-slate-800">
                          {row.student_name}
                        </td>
                        <td className="p-3 text-slate-600">
                          {row.student_class || "-"}
                        </td>
                        <td className="p-3 text-slate-600">{row.bsb_total}</td>
                        <td className="p-3 text-slate-600">{row.bsb_reviewed}</td>
                        <td className="p-3 text-slate-600">
                          {row.bsb_average !== null ? row.bsb_average : "-"}
                        </td>
                        <td className="p-3 text-slate-600">{row.chsb_total}</td>
                        <td className="p-3 text-slate-600">
                          {row.chsb_best_percentage !== null
                            ? `${row.chsb_best_percentage}%`
                            : "-"}
                        </td>
                        <td className="p-3 text-slate-600">
                          {row.chsb_average_percentage !== null
                            ? `${row.chsb_average_percentage}%`
                            : "-"}
                        </td>
                        <td className="p-3 text-slate-600">{row.late_count}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </main>
  );
}