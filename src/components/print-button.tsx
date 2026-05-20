"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PrintButton({ label = "Print / Save PDF" }: { label?: string }) {
  return (
    <Button onClick={() => window.print()} type="button">
      <Printer size={18} />
      {label}
    </Button>
  );
}
