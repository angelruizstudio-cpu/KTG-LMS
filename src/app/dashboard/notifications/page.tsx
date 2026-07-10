import { Bell } from "lucide-react";
import Link from "next/link";

import { markAllNotificationsReadAction, markNotificationReadAction } from "@/app/dashboard/notifications/actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";

export default async function NotificationsPage() {
  const { profile } = await requireProfile();
  const supabase = await createSupabaseServerClient();
  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("recipient_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const unreadCount = (notifications ?? []).filter((notification) => !notification.read_at).length;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-text-primary">
            <Bell size={26} />
            Notifications
          </h1>
          <p className="mt-2 text-text-secondary">Grades, announcements, and discussion replies.</p>
        </div>
        {unreadCount > 0 ? (
          <form action={markAllNotificationsReadAction}>
            <SubmitButton size="sm" variant="secondary">
              Mark all as read
            </SubmitButton>
          </form>
        ) : null}
      </div>

      {(notifications ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-text-secondary">No notifications yet.</CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-text-primary">Recent</h2>
          </CardHeader>
          <CardContent className="grid gap-3">
            {(notifications ?? []).map((notification) => (
              <div
                key={notification.id}
                className={`grid gap-2 rounded-xl border p-3 ${notification.read_at ? "border-border bg-background" : "border-primary bg-primary-light/40"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      {!notification.read_at ? <Badge tone="blue">new</Badge> : null}
                      <p className="font-semibold text-text-primary">{notification.title}</p>
                    </div>
                    {notification.body ? <p className="mt-1 text-sm text-text-secondary">{notification.body}</p> : null}
                    <p className="mt-1 text-xs text-text-secondary">{formatDateTime(notification.created_at)}</p>
                  </div>
                  {!notification.read_at ? (
                    <form action={markNotificationReadAction}>
                      <input name="notificationId" type="hidden" value={notification.id} />
                      <SubmitButton size="sm" variant="ghost">
                        Mark as read
                      </SubmitButton>
                    </form>
                  ) : null}
                </div>
                {notification.link ? (
                  <Link className="w-fit text-sm font-semibold text-primary-hover" href={notification.link}>
                    View
                  </Link>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
