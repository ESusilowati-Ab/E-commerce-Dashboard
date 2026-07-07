import { useState } from "react";
import {
  Settings,
  Brain,
  Palette,
  Database,
  Bell,
  Shield,
  Sparkles,
} from "lucide-react";
import { Card, SectionHeader, Badge } from "../components/ui/Card";
import { cn } from "../lib/utils";

export function SettingsPage() {
  const [theme, setTheme] = useState("dark");
  const [aiModel, setAiModel] = useState("gpt-4");
  const [autoProfile, setAutoProfile] = useState(true);
  const [autoInsights, setAutoInsights] = useState(true);
  const [confidence, setConfidence] = useState(95);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Settings
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure your DataMind AI workspace
        </p>
      </div>

      {/* AI Settings */}
      <Card className="p-5">
        <SectionHeader
          title="AI Configuration"
          icon={<Brain className="w-4 h-4" />}
        />
        <div className="space-y-4">
          <div>
            <label className="label block mb-2">AI Model</label>
            <select
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              className="input"
            >
              <option value="gpt-4">GPT-4 (Recommended)</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster)</option>
              <option value="local">Local Model</option>
            </select>
          </div>
          <div>
            <label className="label block mb-2">
              Confidence Interval: {confidence}%
            </label>
            <input
              type="range"
              min={80}
              max={99}
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
              className="w-full accent-primary-500"
            />
          </div>
          <Toggle
            label="Auto-profile on upload"
            desc="Automatically run data profiling when a dataset is loaded"
            value={autoProfile}
            onChange={setAutoProfile}
          />
          <Toggle
            label="Auto-generate insights"
            desc="Generate AI insights and summary automatically"
            value={autoInsights}
            onChange={setAutoInsights}
          />
        </div>
      </Card>

      {/* Appearance */}
      <Card className="p-5">
        <SectionHeader
          title="Appearance"
          icon={<Palette className="w-4 h-4" />}
        />
        <div>
          <label className="label block mb-2">Theme</label>
          <div className="grid grid-cols-3 gap-3">
            {["dark", "midnight", "slate"].map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={cn(
                  "p-4 rounded-xl border text-left transition capitalize",
                  theme === t
                    ? "border-primary-500/40 bg-primary-500/5"
                    : "border-border-subtle bg-bg-input/30 hover:bg-bg-hover",
                )}
              >
                <div
                  className={cn(
                    "w-full h-8 rounded-lg mb-2",
                    t === "dark" && "bg-bg-base",
                    t === "midnight" && "bg-slate-950",
                    t === "slate" && "bg-slate-800",
                  )}
                />
                <span className="text-sm font-medium text-white">{t}</span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Data */}
      <Card className="p-5">
        <SectionHeader
          title="Data & Privacy"
          icon={<Shield className="w-4 h-4" />}
        />
        <div className="space-y-3">
          <Toggle
            label="Process data locally"
            desc="All analysis runs in your browser — no data sent to servers"
            value={true}
            onChange={() => {}}
          />
          <Toggle
            label="Cache datasets"
            desc="Store recent datasets for faster re-loading"
            value={true}
            onChange={() => {}}
          />
        </div>
      </Card>

      {/* About */}
      <Card className="p-5 bg-gradient-to-br from-bg-card to-bg-panel">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              DataMind AI v1.0.0
            </p>
            <p className="text-xs text-slate-500">
              AI Data Analyst Copilot · Built for portfolio showcase
            </p>
          </div>
          <Badge variant="primary" className="ml-auto">
            Pro
          </Badge>
        </div>
      </Card>
    </div>
  );
}

function Toggle({
  label,
  desc,
  value,
  onChange,
}: {
  label: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={cn(
          "w-11 h-6 rounded-full transition relative",
          value ? "bg-primary-500" : "bg-bg-input border border-border-subtle",
        )}
      >
        <div
          className={cn(
            "absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all",
            value ? "left-[22px]" : "left-0.5",
          )}
        />
      </button>
    </div>
  );
}
