import { ArrowLeft, ArrowRight, CheckCircle2, ChevronLeft, Clock, FileText, PlayCircle, UploadCloud } from "lucide-react";
import Link from "next/link";

import { markLessonCompleteAction } from "@/app/dashboard/student/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDueDate, isOverdue } from "@/lib/utils";
import type { Database } from "@/types/database";

type LessonRow = Database["public"]["Tables"]["lessons"]["Row"];

function youtubeEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);
    const videoId =
      parsed.hostname.includes("youtu.be") ? parsed.pathname.replace("/", "") : parsed.searchParams.get("v") ?? parsed.pathname.split("/").pop();

    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  } catch {
    return null;
  }
}

function lessonIcon(type: LessonRow["lesson_type"]) {
  if (type === "video") {
    return PlayCircle;
  }

  if (type === "pdf") {
    return UploadCloud;
  }

  return FileText;
}

export default async function StudentLessonPage({
  params
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { profile } = await requireProfile(["student", "admin"]);
  const { courseId, lessonId } = await params;
  const supabase = await createSupabaseServerClient();
  const { t } = await getDictionary();
  const tl = t.dashboard.student.lesson;

  const [{ data: course }, { data: enrollment }, { data: modules }] = await Promise.all([
    supabase.from("courses").select("id,title,description").eq("id", courseId).single(),
    supabase.from("enrollments").select("*").eq("course_id", courseId).eq("student_id", profile.id).maybeSingle(),
    supabase.from("course_modules").select("id,title,position").eq("course_id", courseId).order("position")
  ]);

  if (!course || !enrollment) {
    return (
      <Card>
        <CardContent className="grid gap-4 text-center">
          <h1 className="text-xl font-bold text-text-primary">{tl.enrollmentRequiredTitle}</h1>
          <p className="text-sm text-text-secondary">{tl.enrollmentRequiredDescription}</p>
          <Link className="font-semibold text-primary-hover" href="/dashboard/student/catalog">
            {tl.viewProgramCourses}
          </Link>
        </CardContent>
      </Card>
    );
  }

  const moduleIds = modules?.map((module) => module.id) ?? [];
  const [{ data: lessons }, { data: progress }] = await Promise.all([
    moduleIds.length ? supabase.from("lessons").select("*").in("module_id", moduleIds).order("position") : Promise.resolve({ data: [] as LessonRow[] }),
    supabase.from("lesson_progress").select("*").eq("student_id", profile.id)
  ]);

  const modulePosition = new Map((modules ?? []).map((module) => [module.id, module.position]));
  const orderedLessons = [...(lessons ?? [])].sort((a, b) => {
    const moduleSort = (modulePosition.get(a.module_id) ?? 0) - (modulePosition.get(b.module_id) ?? 0);
    return moduleSort || a.position - b.position;
  });
  const currentIndex = orderedLessons.findIndex((lesson) => lesson.id === lessonId);
  const lesson = currentIndex >= 0 ? orderedLessons[currentIndex] : null;
  const previousLesson = currentIndex > 0 ? orderedLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < orderedLessons.length - 1 ? orderedLessons[currentIndex + 1] : null;

  if (!lesson) {
    return (
      <Card>
        <CardContent className="grid gap-4 text-center">
          <h1 className="text-xl font-bold text-text-primary">{tl.lessonNotFoundTitle}</h1>
          <Link className="font-semibold text-primary-hover" href={`/dashboard/student/courses/${course.id}`}>
            {tl.backToCourse}
          </Link>
        </CardContent>
      </Card>
    );
  }

  const completedIds = new Set((progress ?? []).filter((item) => item.completed).map((item) => item.lesson_id));
  const completed = completedIds.has(lesson.id);
  const completedCount = completedIds.size;
  const progressPercent = orderedLessons.length ? Math.round((completedCount / orderedLessons.length) * 100) : enrollment.progress_percent;
  const LessonIcon = lessonIcon(lesson.lesson_type);
  const embedUrl = lesson.video_url ? youtubeEmbedUrl(lesson.video_url) : null;
  const signedPdf = lesson.pdf_path
    ? await supabase.storage.from("lesson-files").createSignedUrl(lesson.pdf_path, 60 * 60).then(({ data }) => data?.signedUrl ?? null)
    : null;

  return (
    <div className="grid gap-6">
      <Link className="inline-flex items-center gap-2 text-sm font-bold text-text-secondary hover:text-primary-hover" href={`/dashboard/student/courses/${course.id}`}>
        <ChevronLeft size={16} />
        {tl.backToCourse}
      </Link>

      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-5">
          <Card>
            <CardContent>
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone={completed ? "green" : "blue"}>{completed ? tl.complete : tl.inProgress}</Badge>
                <Badge>{lesson.lesson_type}</Badge>
                {lesson.due_at ? (
                  <span
                    className={`inline-flex items-center gap-1 text-sm font-semibold ${
                      isOverdue(lesson.due_at, completed) ? "text-error" : "text-text-secondary"
                    }`}
                  >
                    <Clock size={14} />
                    {isOverdue(lesson.due_at, completed) ? tl.overdue : tl.due}
                    {formatDueDate(lesson.due_at)}
                  </span>
                ) : null}
              </div>
              <div className="mt-5 flex gap-4">
                <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-secondary-light text-secondary-hover">
                  <LessonIcon size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold text-text-secondary">{course.title}</p>
                  <h1 className="mt-1 text-3xl font-black leading-tight text-text-primary">{lesson.title}</h1>
                  {course.description ? <p className="mt-3 text-sm leading-6 text-text-secondary">{course.description}</p> : null}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              {lesson.lesson_type === "video" && lesson.video_url ? (
                embedUrl ? (
                  <div className="overflow-hidden rounded-2xl border border-border bg-text-primary">
                    <iframe
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="aspect-video w-full"
                      src={embedUrl}
                      title={lesson.title}
                    />
                  </div>
                ) : (
                  <video className="aspect-video w-full rounded-2xl border border-border bg-text-primary" controls src={lesson.video_url} />
                )
              ) : null}

              {lesson.lesson_type === "pdf" ? (
                signedPdf ? (
                  <iframe className="h-[70vh] w-full rounded-2xl border border-border bg-background" src={signedPdf} title={lesson.title} />
                ) : (
                  <div className="rounded-2xl border border-border bg-background p-6 text-sm text-text-secondary">{tl.pdfUnavailable}</div>
                )
              ) : null}

              {lesson.content ? (
                <div className="prose prose-sm max-w-none whitespace-pre-line text-text-secondary">{lesson.content}</div>
              ) : null}

              {lesson.assignment_prompt ? (
                <div className="mt-5 rounded-2xl border border-border bg-background p-5">
                  <p className="font-bold text-text-primary">{tl.assignment}</p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-text-secondary">{lesson.assignment_prompt}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <aside className="grid gap-5 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardContent>
              <p className="text-sm font-bold text-text-secondary">{tl.courseProgress}</p>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-background">
                <div className="h-full rounded-full bg-primary" style={{ width: `${progressPercent}%` }} />
              </div>
              <p className="mt-3 text-2xl font-black text-text-primary">{progressPercent}%</p>
              <p className="text-sm text-text-secondary">
                {completedCount} {tl.lessonsCompletedOf} {orderedLessons.length} {tl.lessonsCompleted}
              </p>

              <form action={markLessonCompleteAction} className="mt-5">
                <input name="courseId" type="hidden" value={course.id} />
                <input name="lessonId" type="hidden" value={lesson.id} />
                <Button className="w-full" disabled={completed} type="submit">
                  {completed ? (
                    <>
                      <CheckCircle2 size={18} />
                      {tl.lessonComplete}
                    </>
                  ) : (
                    tl.markAsComplete
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="grid gap-3">
              {previousLesson ? (
                <Link
                  className="inline-flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-bold text-text-primary hover:bg-secondary-light"
                  href={`/dashboard/student/courses/${course.id}/lessons/${previousLesson.id}`}
                >
                  <span className="inline-flex items-center gap-2">
                    <ArrowLeft size={16} />
                    {tl.previous}
                  </span>
                </Link>
              ) : null}
              {nextLesson ? (
                <Link
                  className="inline-flex items-center justify-between rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-text-inverse shadow-glow hover:bg-primary-hover"
                  href={`/dashboard/student/courses/${course.id}/lessons/${nextLesson.id}`}
                >
                  {tl.nextLesson}
                  <ArrowRight size={16} />
                </Link>
              ) : null}
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  );
}
