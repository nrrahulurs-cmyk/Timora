"use client";

import * as React from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/feedback/use-toast";

export default function SettingsPage() {
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Settings Saved",
      description: "Academic operations parameters have been successfully updated.",
      variant: "success",
    });
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="System Settings & Constraints"
        description="Configure institution parameters, slot intervals, conflict strictness, and automated notification webhooks."
        breadcrumbs={[{ label: "Governance & System" }, { label: "Settings" }]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Academic Term Configuration</CardTitle>
          <CardDescription>Primary operating calendar settings for Fall 2026.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-lg">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Institution Name</label>
            <Input defaultValue="Timora Institute of Technology" className="text-xs" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Active Term</label>
            <Input defaultValue="Fall 2026 (Odd Semester)" className="text-xs" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Default Slot Duration</label>
            <Input defaultValue="90 minutes" className="text-xs" />
          </div>
          <Button onClick={handleSave} size="sm">
            Save Preferences
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
