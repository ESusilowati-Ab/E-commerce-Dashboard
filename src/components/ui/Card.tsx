import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  delay?: number;
}

export function Card({
  children,
  className,
  hover = false,
  delay = 0,
}: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      className={cn("card", hover && "card-hover", className)}
    >
      {children}
    </motion.div>
  );
}

interface KpiCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  delta?: string;
  deltaType?: "up" | "down" | "neutral";
  icon?: ReactNode;
  delay?: number;
  accent?:
    | "primary"
    | "secondary"
    | "accent"
    | "info"
    | "success"
    | "warning"
    | "error";
}

const accentColors: Record<string, string> = {
  primary: "text-primary-400 bg-primary-500/10",
  secondary: "text-secondary-400 bg-secondary-500/10",
  accent: "text-accent-500 bg-accent-500/10",
  info: "text-blue-400 bg-blue-500/10",
  success: "text-success bg-success/10",
  warning: "text-warning bg-warning/10",
  error: "text-error bg-error/10",
};

export function KpiCard({
  label,
  value,
  sublabel,
  delta,
  deltaType,
  icon,
  delay = 0,
  accent = "primary",
}: KpiCardProps) {
  return (
    <Card delay={delay} className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="label mb-2">{label}</p>
          <p className="kpi-value truncate">{value}</p>
          {sublabel && (
            <p className="text-xs text-slate-500 mt-1.5">{sublabel}</p>
          )}
          {delta && (
            <div className="flex items-center gap-1 mt-2">
              <span
                className={cn(
                  "text-xs font-semibold",
                  deltaType === "up" && "text-success",
                  deltaType === "down" && "text-error",
                  deltaType === "neutral" && "text-slate-400",
                )}
              >
                {deltaType === "up" && "↑ "}
                {deltaType === "down" && "↓ "}
                {delta}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
              accentColors[accent],
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function SectionHeader({
  title,
  subtitle,
  icon,
  action,
}: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-9 h-9 rounded-xl bg-primary-500/10 text-primary-400 flex items-center justify-center">
            {icon}
          </div>
        )}
        <div>
          <h2 className="section-title">{title}</h2>
          {subtitle && (
            <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "primary" | "success" | "warning" | "error" | "info";
  className?: string;
}

export function Badge({
  children,
  variant = "default",
  className,
}: BadgeProps) {
  const variants = {
    default: "bg-bg-hover text-slate-300 border-border-subtle",
    primary: "bg-primary-500/10 text-primary-400 border-primary-500/30",
    success: "bg-success/10 text-success border-success/30",
    warning: "bg-warning/10 text-warning border-warning/30",
    error: "bg-error/10 text-error border-error/30",
    info: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  };
  return (
    <span className={cn("chip border", variants[variant], className)}>
      {children}
    </span>
  );
}

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-bg-card border border-border-subtle flex items-center justify-center text-slate-500 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-md mb-6">{description}</p>
      {action}
    </div>
  );
}
