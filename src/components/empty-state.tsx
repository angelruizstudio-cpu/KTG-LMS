import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";

export function EmptyState({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="grid place-items-center gap-4 py-12 text-center">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
          <p className="mt-2 max-w-md text-sm text-text-secondary">{description}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}
