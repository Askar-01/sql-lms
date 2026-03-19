"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@/utils/supabase/client";

type ModuleItem = {
  id: number;
  title: string;
  description: string | null;
};

type LessonItem = {
  id: number;
  title: string;
  content: string | null;
  order_no: number;
};

type AssessmentItem = {
  id: number;
  title: string;
  description: string | null;
  type: "lesson_quiz" | "bsb" | "chsb";
  duration_minutes: number;
};

export default function ModulePage() {
  const params = useParams();
  const moduleId = Number(params.id);

  const [moduleItem, setModuleItem] = useState<ModuleItem | null>(null);
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const supabase = createBrowserClient();

      const { data: moduleData, error: moduleError } = await supabase
        .from("modules")
        .select("id, title, description")
        .eq("id", moduleId)
        .single();

      const { data: lessonsData, error: lessonsError } = await supabase
        .from("lessons")
        .select("id, title, content, order_no")
        .eq("module_id", moduleId)
        .eq("is_published", true)
        .order("order_no", { ascending: true });

      const { data: assessmentData, error: assessmentError } = await supabase
        .from("assessments")
        .select("id, title, description, type, duration_minutes")
        .eq("module_id", moduleId)
        .eq("is_published", true)
        .in("type", ["bsb", "chsb"]);

      if (moduleError) {
        console.error(moduleError.message);
      } else {
        setModuleItem(moduleData);
      }

      if (lessonsError) {
        console.error(lessonsError.message);
      } else {
        setLessons(lessonsData || []);
      }

      if (assessmentError) {
        console.error(assessmentError.message);
      } else {
        setAssessments(assessmentData || []);
      }

      setLoading(false);
    };

    if (!Number.isNaN(moduleId)) {
      loadData();
    }
  }, [moduleId]);

  const getBadgeText = (type: AssessmentItem["type"]) => {
    if (type === "bsb") return "BSB";
    if (type === "chsb") return "CHSB";
    return "Quiz";
  };

  const getBadgeClass = (type: AssessmentItem["type"]) => {
    if (type === "bsb") return "bg-amber-100 text-amber-700";
    if (type === "chsb") return "bg-rose-100 text-rose-700";
    return "bg-blue-100 text-blue-700";
  };

  const getAssessmentHref = (assessment: AssessmentItem) => {
    if (assessment.type === "bsb") return `/bsb/${assessment.id}`;
    return `/quizzes/${assessment.id}`;
  };

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/" className="text-blue-600 font-medium">
            ← Bosh sahifaga qaytish
          </Link>
        </div>

        {loading ? (
          <p className="text-slate-600">Yuklanmoqda...</p>
        ) : !moduleItem ? (
          <p className="text-red-600">Modul topilmadi.</p>
        ) : (
          <>
            <div className="bg-white rounded-2xl shadow-md p-8 mb-8">
              <h1 className="text-3xl font-bold text-slate-800 mb-3">
                {moduleItem.title}
              </h1>
              <p className="text-slate-600">{moduleItem.description}</p>
            </div>

            {assessments.length > 0 && (
              <div className="bg-white rounded-2xl shadow-md p-8 mb-8">
                <h2 className="text-2xl font-semibold text-slate-800 mb-4">
                  Nazoratlar
                </h2>

                <div className="space-y-4">
                  {assessments.map((assessment) => (
                    <Link key={assessment.id} href={getAssessmentHref(assessment)}>
                      <div className="border border-slate-200 rounded-2xl p-5 hover:shadow-md transition cursor-pointer">
                        <div className="flex items-center justify-between gap-4 mb-2">
                          <h3 className="text-xl font-bold text-slate-800">
                            {assessment.title}
                          </h3>
                          <span
                            className={`text-xs font-bold px-3 py-1 rounded-full ${getBadgeClass(
                              assessment.type
                            )}`}
                          >
                            {getBadgeText(assessment.type)}
                          </span>
                        </div>

                        <p className="text-slate-600 mb-3">
                          {assessment.description}
                        </p>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">
                            {assessment.type === "bsb"
                              ? "Fayl topshirish"
                              : `Davomiyligi: ${assessment.duration_minutes} daqiqa`}
                          </span>
                          <span className="text-blue-600 font-medium">
                            {assessment.type === "bsb" ? "Topshirish →" : "Boshlash →"}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-4">
              <h2 className="text-2xl font-semibold text-slate-800">
                Darslar ro‘yxati
              </h2>
            </div>

            {lessons.length === 0 ? (
              <p className="text-slate-600">Bu modulda darslar yo‘q.</p>
            ) : (
              <div className="space-y-4">
                {lessons.map((lesson) => (
                  <Link key={lesson.id} href={`/lessons/${lesson.id}`}>
                    <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-200 hover:shadow-lg transition cursor-pointer">
                      <h3 className="text-xl font-bold text-slate-800 mb-2">
                        {lesson.order_no}. {lesson.title}
                      </h3>
                      <p className="text-slate-600 mb-2">{lesson.content}</p>
                      <p className="text-sm text-blue-600 font-medium">
                        Darsni ochish →
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}