"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { createBrowserClient } from "@/utils/supabase/client";

type AssessmentItem = {
  id: number;
  title: string;
  description: string | null;
  type: "lesson_quiz" | "bsb" | "chsb";
  module_id: number | null;
  max_score: number;
  due_at: string | null;
};

type ProfileItem = {
  full_name: string | null;
  class_name: string | null;
};

export default function BsbPage() {
  const params = useParams();
  const assessmentId = Number(params.id);

  const [assessment, setAssessment] = useState<AssessmentItem | null>(null);
  const [studentName, setStudentName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [studentComment, setStudentComment] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const loadAssessment = async () => {
      const supabase = createBrowserClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserId(user.id);

        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name, class_name")
          .eq("id", user.id)
          .single();

        if (profileData) {
          setProfile(profileData);
          setStudentName(profileData.full_name || "");
          setStudentClass(profileData.class_name || "");
        }
      }

      const { data, error } = await supabase
        .from("assessments")
        .select("id, title, description, type, module_id, max_score, due_at")
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

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!assessment || !selectedFile || !studentName.trim() || !userId) {
      return;
    }

    setSubmitting(true);
    setSuccessMessage("");

    const supabase = createBrowserClient();

    const safeFileName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniquePath = `${assessment.id}/${userId}/${Date.now()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("bsb-submissions")
      .upload(uniquePath, selectedFile, {
        upsert: false,
      });

    if (uploadError) {
      console.error(uploadError.message);
      setSubmitting(false);
      return;
    }

    const submittedLate =
      assessment.due_at !== null
        ? new Date().getTime() > new Date(assessment.due_at).getTime()
        : false;

    const { error: insertError } = await supabase.from("bsb_submissions").insert({
      assessment_id: assessment.id,
      user_id: userId,
      student_name: studentName.trim(),
      student_class: studentClass.trim() || null,
      file_name: selectedFile.name,
      file_path: uniquePath,
      file_size: selectedFile.size,
      mime_type: selectedFile.type || null,
      student_comment: studentComment.trim() || null,
      status: "submitted",
      submitted_late: submittedLate,
    });

    if (insertError) {
      console.error(insertError.message);
      setSubmitting(false);
      return;
    }

    setSuccessMessage(
      submittedLate
        ? "Ish muvaffaqiyatli topshirildi, lekin deadline dan keyin yuborildi."
        : "Ish muvaffaqiyatli topshirildi."
    );
    setStudentComment("");
    setSelectedFile(null);
    setSubmitting(false);
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
        <div className="max-w-4xl mx-auto text-red-600">BSB topshirig‘i topilmadi.</div>
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
          {assessment.module_id && (
            <Link
              href={`/modules/${assessment.module_id}`}
              className="text-blue-600 font-medium"
            >
              ← Modulga qaytish
            </Link>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-md p-8 mb-8">
          <p className="text-sm text-amber-700 font-medium mb-3">BSB</p>
          <h1 className="text-3xl font-bold text-slate-800 mb-3">
            {assessment.title}
          </h1>
          <p className="text-slate-600 mb-4">{assessment.description}</p>
          <p className="text-sm text-slate-500 mb-2">
            Maksimal ball: {assessment.max_score}
          </p>
          <p className="text-sm text-rose-600 font-medium">
            Deadline: {dueText}
          </p>
        </div>

        {!userId ? (
          <div className="bg-white rounded-2xl shadow-md p-8">
            <p className="text-red-600 mb-4">
              BSB topshirish uchun avval tizimga kirishingiz kerak.
            </p>
            <Link
              href="/auth"
              className="inline-block rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
            >
              Auth sahifasiga o‘tish
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-md p-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">
              Ishni topshirish
            </h2>

            {successMessage && (
              <div className="mb-6 rounded-xl bg-emerald-50 px-4 py-3 text-emerald-700">
                {successMessage}
              </div>
            )}

            {profile && (
              <div className="mb-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                Login qilingan foydalanuvchi:{" "}
                <span className="font-medium text-slate-800">
                  {profile.full_name || "Nomsiz user"}
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
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

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Izoh
                </label>
                <textarea
                  value={studentComment}
                  onChange={(e) => setStudentComment(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 min-h-28"
                  placeholder="Ish haqida qisqa izoh yozishingiz mumkin"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Fayl yuklash
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  className="block w-full rounded-xl border border-slate-300 px-4 py-3"
                  required
                />
                <p className="mt-2 text-xs text-slate-500">
                  Qo‘llab-quvvatlanadi: PDF, DOCX, PPTX, XLSX, ZIP, JPG, PNG
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-70"
              >
                {submitting ? "Yuborilmoqda..." : "Ishni topshirish"}
              </button>
            </form>

            <div className="mt-8 space-y-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              <div>
                O‘quvchi natija sahifasi:{" "}
                <Link
                  href={`/bsb/${assessment.id}/status`}
                  className="font-medium text-blue-600"
                >
                  /bsb/{assessment.id}/status
                </Link>
              </div>

              <div>
                Prototip ko‘rigi sahifasi:{" "}
                <span className="font-medium text-slate-800">
                  /teacher/bsb/{assessment.id}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}