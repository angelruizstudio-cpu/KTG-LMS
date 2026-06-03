import { Card, CardContent } from "@/components/ui/card";

export default function LessonLoading() {
  return (
    <div className="grid gap-6">
      <div className="h-5 w-36 animate-pulse rounded-full bg-border" />
      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-5">
          <Card>
            <CardContent>
              <div className="h-7 w-2/3 animate-pulse rounded-full bg-border" />
              <div className="mt-4 h-4 w-1/2 animate-pulse rounded-full bg-border" />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div className="aspect-video w-full animate-pulse rounded-2xl bg-border" />
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardContent>
            <div className="h-4 w-32 animate-pulse rounded-full bg-border" />
            <div className="mt-4 h-3 w-full animate-pulse rounded-full bg-border" />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
