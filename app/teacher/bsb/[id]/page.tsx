"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@/utils/supabase/client";

type AssessmentItem = {
  id: number;
  title: string;
  description: string | null;
  max_score: number;
  due_at: string | null;
};

type SubmissionItem = {
  id: number;
  assessment_id: number;
  student_name: string;
  student_class: string | null;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  student_comment: string | null;
  status: "submitted" | "reviewed" | "returned";
  teacher_score: number | null;
  teacher_comment: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  submitted_late: boolean;
};

function SubmissionCard({
  submission,
  maxScore,
  onSave,
}: {
  submission: SubmissionItem;
  maxScore: number;
  onSave: (id: number, score: string, comment: string, status: string) => Promise<void>;
}) {
  const [score, setScore] = useState(
    submission.teacher_score !== null ? String(submission.teacher_score) : ""
  );
  const [comment, setComment] = useState(submission.teacher_comment || "");
  const [status, setStatus] = useState(submission.status);
  const [saving, setSaving] = useState(false);

  const supabase = createBrowserClient();
  const publicUrl = useMemo(() => {
    return supabase.storage.from("bsb-submissions").getPublicUrl(submission.file_path)
      .data.publicUrl;
  }, [supabase, submission.file_path]);

  const handleSave = async () => {
    setSaving(true);
    await onSave(submission.id, score, comment, status);
    setSaving(false);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-xl font-bold text-slate-800">
            {submission.student_name}
          </h3>
          <p className="text-slate-500">
            {submission.student_class || "Sinf ko‘rsatilmagan"}
          </p>
        </div>

        <div className="flex gap-2">
          {submission.submitted_late && (
            <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
              Kech topshirilgan
            </span>
          )}
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {submission.status}
          </span>
        </div>
      </div>

      <div className="space-y-2 text-sm text-slate-600 mb-5">
        <p>
          <span className="font-medium text-slate-800">Fayl:</span> {submission.file_name}
        </p>
        <p>
          <span className="font-medium text-slate-800">Yuborilgan vaqt:</span>{" "}
          {new Date(submission.submitted_at).toLocaleString()}
        </p>
        {submission.student_comment && (
          <p>
            <span className="font-medium text-slate-800">Izoh:</span>{" "}
            {submission.student_comment}
          </p>
        )}
      </div>

      <div className="mb-5">
        <a
          href={publicUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-block rounded-xl border border-slate-200 px-4 py-2 font-medium text-blue-600"
        >
          Faylni ochish
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Ball
          </label>
          <input
            value={score}
            onChange={(e) => setScore(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            placeholder={`0 - ${maxScore}`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Status
          </label>
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as "submitted" | "reviewed" | "returned")
            }
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
          >
            <option value="submitted">submitted</option>
            <option value="reviewed">reviewed</option>
            <option value="returned">returned</option>
          </select>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          O‘qituvchi izohi
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full min-h-28 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
          placeholder="Ish bo‘yicha izoh yozing"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white disabled:opacity-70"
      >
        {saving ? "Saqlanmoqda..." : "Bahoni saqlash"}
      </button>
    </div>
  );
}

export default function TeacherBsbReviewPage() {
  const params = useParams();
  const assessmentId = Number(params.id);

  const [assessment, setAssessment] = useState<AssessmentItem | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [lateOnly, setLateOnly] = useState(false);

  const loadData = async () => {
    const supabase = createBrowserClient();

    const { data: assessmentData, error: assessmentError } = await supabase
      .from("assessments")
      .select("id, title, description, max_score, due_at")
      .eq("id", assessmentId)
      .eq("type", "bsb")
      .single();

    const { data: submissionsData, error: submissionsError } = await supabase
      .from("bsb_submissions")
      .select("*")
      .eq("assessment_id", assessmentId)
      .order("submitted_at", { ascending: false });

    if (assessmentError) {
      console.error(assessmentError.message);
    } else {
      setAssessment(assessmentData);
    }

    if (submissionsError) {
      console.error(submissionsError.message);
    } else {
      setSubmissions(submissionsData || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (!Number.isNaN(assessmentId)) {
      loadData();
    }
  }, [assessmentId]);

  const handleSave = async (
    submissionId: number,
    score: string,
    comment: string,
    status: string
  ) => {
    const supabase = createBrowserClient();

    const scoreValue = score.trim() === "" ? null : Number(score);

    const { error } = await supabase
      .from("bsb_submissions")
      .update({
        teacher_score: scoreValue,
        teacher_comment: comment.trim() || null,
        status,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", submissionId);

    if (error) {
      console.error(error.message);
      return;
    }

    await loadData();
  };

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((item) => {
      const matchesSearch =
        searchText.trim() === "" ||
        item.student_name.toLowerCase().includes(searchText.toLowerCase()) ||
        (item.student_class || "").toLowerCase().includes(searchText.toLowerCase()) ||
        item.file_name.toLowerCase().includes(searchText.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;

      const matchesLate = !lateOnly || item.submitted_late;

      return matchesSearch && matchesStatus && matchesLate;
    });
  }, [submissions, searchText, statusFilter, lateOnly]);

  const stats = useMemo(() => {
    return {
      total: submissions.length,
      submitted: submissions.filter((s) => s.status === "submitted").length,
      reviewed: submissions.filter((s) => s.status === "reviewed").length,
      returned: submissions.filter((s) => s.status === "returned").length,
      late: submissions.filter((s) => s.submitted_late).length,
    };
  }, [submissions]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="max-w-5xl mx-auto text-slate-600">Yuklanmoqda...</div>
      </main>
    );
  }

  if (!assessment) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="max-w-5xl mx-auto text-red-600">
          BSB review sahifasi topilmadi.
        </div>
      </main>
    );
  }

  const dueText = assessment.due_at
    ? new Date(assessment.due_at).toLocaleString()
    : "Belgilanmagan";

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex gap-4">
          <Link href="/" className="text-blue-600 font-medium">
            ← Bosh sahifa
          </Link>
          <Link href={`/bsb/${assessment.id}`} className="text-blue-600 font-medium">
            ← BSB topshirish sahifasi
          </Link>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-md mb-8">
          <p className="mb-3 text-sm font-medium text-amber-700">O‘qituvchi ko‘rigi</p>
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

        <div className="grid gap-4 md:grid-cols-5 mb-8">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500 mb-2">Jami</p>
            <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500 mb-2">submitted</p>
            <p className="text-2xl font-bold text-blue-600">{stats.submitted}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500 mb-2">reviewed</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.reviewed}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500 mb-2">returned</p>
            <p className="text-2xl font-bold text-amber-600">{stats.returned}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500 mb-2">Kech topshirilgan</p>
            <p className="text-2xl font-bold text-rose-600">{stats.late}</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-md mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4">
            Qidiruv va filter
          </h2>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Qidirish
              </label>
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Ism, sinf yoki fayl nomi"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              >
                <option value="all">Barchasi</option>
                <option value="submitted">submitted</option>
                <option value="reviewed">reviewed</option>
                <option value="returned">returned</option>
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-3 rounded-xl border border-slate-300 px-4 py-3 w-full">
                <input
                  type="checkbox"
                  checked={lateOnly}
                  onChange={(e) => setLateOnly(e.target.checked)}
                />
                <span className="text-slate-700">Faqat kech topshirilganlar</span>
              </label>
            </div>
          </div>
        </div>

        {filteredSubmissions.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 shadow-md text-slate-600">
            Mos submission topilmadi.
          </div>
        ) : (
          <div className="space-y-5">
            {filteredSubmissions.map((submission) => (
              <SubmissionCard
                key={submission.id}
                submission={submission}
                maxScore={assessment.max_score}
                onSave={handleSave}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}