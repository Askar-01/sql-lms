"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@/utils/supabase/client";

type ProfileItem = {
  full_name: string | null;
  role: "student" | "teacher" | "admin";
};

type AssessmentItem = {
  id: number;
  title: string;
  description: string | null;
  type: "bsb" | "chsb";
  module_id: number | null;
  duration_minutes: number;
  max_score: number | null;
};

type SubmissionItem = {
  id: number;
  assessment_id: number;
  student_name: string;
  student_class: string | null;
  file_name: string;
  status: "submitted" | "reviewed" | "returned";
  submitted_at: string;
  submitted_late: boolean;
  assessments?: {
    id: number;
    title: string;
  } | null;
};

export default function TeacherPage() {
  const [profile, setProfile] = useState<ProfileItem | null>(null);
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      const supabase = createBrowserClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", user.id)
          .single();

        if (profileData) {
          setProfile(profileData);
        }
      }

      const { data: assessmentData, error: assessmentError } = await supabase
        .from("assessments")
        .select("id, title, description, type, module_id, duration_minutes, max_score")
        .in("type", ["bsb", "chsb"])
        .eq("is_published", true)
        .order("id", { ascending: false });

      if (assessmentError) {
        console.error(assessmentError.message);
      } else {
        setAssessments((assessmentData || []) as AssessmentItem[]);
      }

      const { data: submissionData, error: submissionError } = await supabase
        .from("bsb_submissions")
        .select(`
          id,
          assessment_id,
          student_name,
          student_class,
          file_name,
          status,
          submitted_at,
          submitted_late,
          assessments (
            id,
            title
          )
        `)
        .order("submitted_at", { ascending: false });

      if (submissionError) {
        console.error(submissionError.message);
      } else {
        setSubmissions((submissionData || []) as SubmissionItem[]);
      }

      setLoading(false);
    };

    loadDashboard();
  }, []);

  const stats = useMemo(() => {
    const bsbList = assessments.filter((item) => item.type === "bsb");
    const chsbList = assessments.filter((item) => item.type === "chsb");

    return {
      totalBsb: bsbList.length,
      totalChsb: chsbList.length,
      totalSubmissions: submissions.length,
      reviewed: submissions.filter((item) => item.status === "reviewed").length,
      late: submissions.filter((item) => item.submitted_late).length,
    };
  }, [assessments, submissions]);

  const bsbAssessments = assessments.filter((item) => item.type === "bsb");
  const chsbAssessments = assessments.filter((item) => item.type === "chsb");
  const recentSubmissions = submissions.slice(0, 5);

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

        <div className="bg-white rounded-2xl shadow-md p-8 mb-8">
          <p className="text-sm text-emerald-700 font-medium mb-3">Teacher panel</p>
          <h1 className="text-3xl font-bold text-slate-800 mb-3">
            O‘qituvchi kabineti
          </h1>
          <p className="text-slate-600">
            {profile?.full_name
              ? `${profile.full_name}, teacher dashboardga xush kelibsiz.`
              : "Teacher dashboardga xush kelibsiz."}
          </p>

          <div className="mt-5">
            <Link
              href="/teacher/gradebook"
              className="inline-block rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white"
            >
              Gradebookni ochish
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl shadow-md p-8 text-slate-600">
            Yuklanmoqda...
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-5 mb-8">
              <div className="bg-white rounded-2xl shadow-md p-6">
                <p className="text-sm text-slate-500 mb-2">BSB soni</p>
                <p className="text-3xl font-bold text-amber-600">{stats.totalBsb}</p>
              </div>

              <div className="bg-white rounded-2xl shadow-md p-6">
                <p className="text-sm text-slate-500 mb-2">CHSB soni</p>
                <p className="text-3xl font-bold text-rose-600">{stats.totalChsb}</p>
              </div>

              <div className="bg-white rounded-2xl shadow-md p-6">
                <p className="text-sm text-slate-500 mb-2">Jami submissions</p>
                <p className="text-3xl font-bold text-slate-800">{stats.totalSubmissions}</p>
              </div>

              <div className="bg-white rounded-2xl shadow-md p-6">
                <p className="text-sm text-slate-500 mb-2">Reviewed</p>
                <p className="text-3xl font-bold text-emerald-600">{stats.reviewed}</p>
              </div>

              <div className="bg-white rounded-2xl shadow-md p-6">
                <p className="text-sm text-slate-500 mb-2">Late</p>
                <p className="text-3xl font-bold text-red-600">{stats.late}</p>
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              <div className="bg-white rounded-2xl shadow-md p-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-4">
                  BSB nazoratlari
                </h2>

                {bsbAssessments.length === 0 ? (
                  <p className="text-slate-600">BSB topilmadi.</p>
                ) : (
                  <div className="space-y-4">
                    {bsbAssessments.map((item) => (
                      <div
                        key={item.id}
                        className="border border-slate-200 rounded-2xl p-5"
                      >
                        <div className="flex items-center justify-between gap-4 mb-2">
                          <h3 className="text-xl font-bold text-slate-800">
                            {item.title}
                          </h3>
                          <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-700">
                            BSB
                          </span>
                        </div>

                        <p className="text-slate-600 mb-4">{item.description}</p>

                        <div className="flex flex-wrap gap-3">
                          <Link
                            href={`/bsb/${item.id}`}
                            className="rounded-xl bg-blue-600 px-4 py-2 font-medium text-white"
                          >
                            Topshirish sahifasi
                          </Link>

                          <Link
                            href={`/teacher/bsb/${item.id}`}
                            className="rounded-xl border border-slate-200 px-4 py-2 font-medium text-slate-800"
                          >
                            Tekshirish sahifasi
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-md p-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-4">
                  CHSB nazoratlari
                </h2>

                {chsbAssessments.length === 0 ? (
                  <p className="text-slate-600">CHSB topilmadi.</p>
                ) : (
                  <div className="space-y-4">
                    {chsbAssessments.map((item) => (
                      <div
                        key={item.id}
                        className="border border-slate-200 rounded-2xl p-5"
                      >
                        <div className="flex items-center justify-between gap-4 mb-2">
                          <h3 className="text-xl font-bold text-slate-800">
                            {item.title}
                          </h3>
                          <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-100 text-rose-700">
                            CHSB
                          </span>
                        </div>

                        <p className="text-slate-600 mb-3">{item.description}</p>

                        <p className="text-sm text-slate-500 mb-4">
                          Davomiyligi: {item.duration_minutes} daqiqa
                        </p>

                        <Link
                          href={`/quizzes/${item.id}`}
                          className="rounded-xl bg-rose-600 px-4 py-2 font-medium text-white inline-block"
                        >
                          Testni ochish
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-8 mt-8">
              <h2 className="text-2xl font-bold text-slate-800 mb-4">
                Oxirgi submissions
              </h2>

              {recentSubmissions.length === 0 ? (
                <p className="text-slate-600">Hali submissions yo‘q.</p>
              ) : (
                <div className="space-y-4">
                  {recentSubmissions.map((item) => (
                    <div
                      key={item.id}
                      className="border border-slate-200 rounded-2xl p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
                        <div>
                          <h3 className="text-lg font-bold text-slate-800">
                            {item.student_name}
                          </h3>
                          <p className="text-sm text-slate-500">
                            {item.student_class || "Sinf ko‘rsatilmagan"}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          {item.submitted_late && (
                            <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-100 text-red-700">
                              Late
                            </span>
                          )}
                          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                            {item.status}
                          </span>
                        </div>
                      </div>

                      <p className="text-slate-600 mb-2">
                        {item.assessments?.title || "BSB topshiriq"}
                      </p>

                      <p className="text-sm text-slate-500 mb-4">
                        Fayl: {item.file_name}
                      </p>

                      <div className="flex flex-wrap gap-3">
                        <Link
                          href={`/teacher/bsb/${item.assessment_id}`}
                          className="rounded-xl border border-slate-200 px-4 py-2 font-medium text-slate-800"
                        >
                          Tekshirish sahifasiga o‘tish
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}