import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Database,
  MessageSquare,
  Sparkles,
  BarChart3,
  Code2,
  TrendingUp,
  Sigma,
  FileText,
  Download,
  Settings,
  Brain,
} from "lucide-react";
import { cn } from "../lib/utils";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/sources", label: "Data Sources", icon: Database },
  { to: "/chat", label: "AI Chat", icon: MessageSquare },
  { to: "/cleaning", label: "Data Cleaning", icon: Sparkles },
  { to: "/profiling", label: "Data Profiling", icon: BarChart3 },
  { to: "/visualizations", label: "Visualizations", icon: BarChart3 },
  { to: "/sql", label: "SQL Explorer", icon: Code2 },
  { to: "/forecasting", label: "Forecasting", icon: TrendingUp },
  { to: "/statistics", label: "Statistical Analysis", icon: Sigma },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/export", label: "Export", icon: Download },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 glass-panel border-r border-border-subtle flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center shadow-glow">
            <Brain className="w-5 h-5 text-white" />
            <motion.div
              className="absolute inset-0 rounded-xl border-2 border-primary-400/50"
              animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">
              DataMind AI
            </h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">
              Analyst Copilot
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto no-scrollbar px-3 py-4 space-y-1">
        <p className="label px-3 mb-2">Workspace</p>
        {navItems.slice(0, 2).map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
        <p className="label px-3 mb-2 mt-4">Analysis</p>
        {navItems.slice(2, 9).map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
        <p className="label px-3 mb-2 mt-4">Output</p>
        {navItems.slice(9).map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-border-subtle">
        <div className="card p-3 bg-bg-input/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-500 to-primary-500 flex items-center justify-center text-white text-xs font-bold">
              DA
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                Data Analyst
              </p>
              <p className="text-xs text-slate-500">Pro Plan</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavItem({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        cn("nav-item", isActive && "nav-item-active")
      }
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}
