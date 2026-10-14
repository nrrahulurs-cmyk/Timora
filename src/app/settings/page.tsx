"use client";

import * as React from "react";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/feedback/use-toast";
import { Settings, Shield, Bell, Database, Save, CheckCircle2 } from "lucide-react";

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
      <WorkspaceHeader
        section="Settings"
        title="System Settings & Constraints"
        badge={
          <Badge variant="outline" size="sm" className="bg-slate-50 border-slate-200 text-slate-600 rounded-full text-[11px] font-medium">
            PostgreSQL 17 Operational
          </Badge>
        }
        actions={
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            className="gap-1.5 text-xs h-8 rounded-full px-4 shadow-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save Preferences</span>
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-3xl border border-slate-100 shadow-card-soft bg-white p-6">
          <CardHeader className="p-0 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900">Academic Term Configuration</CardTitle>
                <CardDescription className="text-xs text-slate-400 mt-0.5">Primary operating calendar settings for Fall 2026.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 pt-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Institution Name</label>
              <Input defaultValue="Timora Institute of Technology" className="rounded-xl text-xs bg-slate-50 border-slate-200" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Active Academic Term</label>
              <Input defaultValue="Fall 2026 (Odd Semester)" className="rounded-xl text-xs bg-slate-50 border-slate-200" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Default Slot Duration</label>
              <Input defaultValue="90 minutes" className="rounded-xl text-xs bg-slate-50 border-slate-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-slate-100 shadow-card-soft bg-white p-6">
          <CardHeader className="p-0 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900">Constraint Engine & Security</CardTitle>
                <CardDescription className="text-xs text-slate-400 mt-0.5">Automated conflict strictness and governance.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 pt-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Conflict Detection Rigor</label>
              <Input defaultValue="Deterministic Non-Overlapping (Strict)" className="rounded-xl text-xs bg-slate-50 border-slate-200" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Max Faculty Daily Teaching Hours</label>
              <Input defaultValue="6.0 Hours" className="rounded-xl text-xs bg-slate-50 border-slate-200" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Lunch & Studio Intermission</label>
              <Input defaultValue="12:00 PM – 01:00 PM (Enforced)" className="rounded-xl text-xs bg-slate-50 border-slate-200" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
