"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { createBrowserClient } from "@/utils/supabase/client";

type AssessmentItem = {
  id: number;
  title: string;
  description: string | null;
  max_score: number;
  module_id: number | null;
  due_at: string | null;
};

type SubmissionItem = {
  id: number;
  student_name: string;
  student_class: string | null;
  file_name: string;
  status: "submitted" | "reviewed" | "returned";
  teacher_score: number | null;
  teacher_comment: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  submitted_late: boolean;
};

export default function BsbStatusPage() {
  const params = useParams();
  const assessmentId = Number(params.id);

  const [assessment, setAssessment] = useState<AssessmentItem | null>(null);
  const [studentName, setStudentName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [result, setResult] = useState<SubmissionItem | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAssessment = async () => {
      const supabase = createBrowserClient();

      const { data, error } = await supabase
        .from("assessments")
        .select("id, title, description, max_score, module_id, due_at")
        .eq("id", assessmentId)
        .eq("type", "bsb")
        .single();

      if (error) {
        console.error(error.message);
      } else {
        setAssessment(data);
      }

      setLoading(false);
    };

    if (!Number.isNaN(assessmentId)) {
      loadAssessment();
    }
  }, [assessmentId]);

  const handleSearch = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!studentName.trim()) return;

    const supabase = createBrowserClient();

    let query = supabase
      .from("bsb_submissions")
      .select(
        "id, student_name, student_class, file_name, status, teacher_score, teacher_comment, submitted_at, reviewed_at, submitted_late"
      )
      .eq("assessment_id", assessmentId)
      .ilike("student_name", studentName.trim())
      .order("submitted_at", { ascending: false })
      .limit(1);

    if (studentClass.trim()) {
      query = query.ilike("student_class", studentClass.trim());
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error(error.message);
      setResult(null);
    } else {
      setResult(data);
    }

    setSearched(true);
  };

  const getStatusLabel = (status: SubmissionItem["status"]) => {
    if (status === "submitted") return "Topshirildi";
    if (status === "reviewed") return "Tekshirildi";
    return "Qayta ko‘rib chiqish uchun qaytarildi";
  };

  const getStatusClass = (status: SubmissionItem["status"]) => {
    if (status === "submitted") return "bg-blue-100 text-blue-700";
    if (status === "reviewed") return "bg-emerald-100 text-emerald-700";
    return "bg-amber-100 text-amber-700";
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="max-w-4xl mx-auto text-slate-600">Yuklanmoqda...</div>
      </main>
    );
  }

  if (!assessment) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="max-w-4xl mx-auto text-red-600">
          BSB natija sahifasi topilmadi.
        </div>
      </main>
    );
  }

  const dueText = assessment.due_at
    ? new Date(assessment.due_at).toLocaleString()
    : "Belgilanmagan";

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex gap-4">
          <Link href="/" className="text-blue-600 font-medium">
            ← Bosh sahifa
          </Link>
          <Link href={`/bsb/${assessment.id}`} className="text-blue-600 font-medium">
            ← BSB topshirish sahifasi
          </Link>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-md mb-8">
          <p className="mb-3 text-sm font-medium text-amber-700">
            BSB natijasi
          </p>
          <h1 className="mb-3 text-3xl font-bold text-slate-800">
            {assessment.title}
          </h1>
          <p className="text-slate-600 mb-3">{assessment.description}</p>
          <p className="text-sm text-slate-500 mb-2">
            Maksimal ball: {assessment.max_score}
          </p>
          <p className="text-sm text-rose-600 font-medium">
            Deadline: {dueText}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-md mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">
            Natijani tekshirish
          </h2>

          <form onSubmit={handleSearch} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                O‘quvchi F.I.Sh.
              </label>
              <input
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                placeholder="Masalan: Asqar Janabaev"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Sinf
              </label>
              <input
                value={studentClass}
                onChange={(e) => setStudentClass(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                placeholder="Masalan: 12-A"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
              >
                Natijani ko‘rish
              </button>
            </div>
          </form>
        </div>

        {searched && !result && (
          <div className="rounded-2xl bg-white p-8 shadow-md text-red-600">
            Natija topilmadi. Ism yoki sinfni tekshirib qayta urinib ko‘ring.
          </div>
        )}

        {result && (
          <div className="rounded-2xl bg-white p-8 shadow-md">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <h3 className="text-2xl font-bold text-slate-800">
                  {result.student_name}
                </h3>
                <p className="text-slate-500">
                  {result.student_class || "Sinf ko‘rsatilmagan"}
                </p>
              </div>

              <div className="flex gap-2">
                {result.submitted_late && (
                  <span className="rounded-full px-3 py-1 text-sm font-semibold bg-rose-100 text-rose-700">
                    Kech topshirilgan
                  </span>
                )}
                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${getStatusClass(
                    result.status
                  )}`}
                >
                  {getStatusLabel(result.status)}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-slate-700 mb-6">
              <p>
                <span className="font-semibold">Topshirilgan fayl:</span>{" "}
                {result.file_name}
              </p>
              <p>
                <span className="font-semibold">Topshirilgan vaqt:</span>{" "}
                {new Date(result.submitted_at).toLocaleString()}
              </p>
              <p>
                <span className="font-semibold">Ball:</span>{" "}
                {result.teacher_score !== null
                  ? `${result.teacher_score} / ${assessment.max_score}`
                  : "Hali qo‘yilmagan"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-5">
              <p className="text-sm font-medium text-slate-500 mb-2">
                O‘qituvchi izohi
              </p>
              <p className="text-slate-800">
                {result.teacher_comment || "Hali izoh yozilmagan"}
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}