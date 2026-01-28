"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: string;
  title: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <nav aria-label="Progress" className={cn("w-full", className)}>
      <ol className="flex items-center">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isLast = index === steps.length - 1;

          return (
            <li
              key={step.id}
              className={cn("relative", !isLast && "flex-1 pr-8 sm:pr-20")}
            >
              <div className="flex items-center">
                <div
                  className={cn(
                    "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors",
                    isCompleted
                      ? "border-indigo-500 bg-indigo-500 text-white"
                      : isCurrent
                      ? "border-indigo-500 bg-indigo-500/20 text-indigo-400"
                      : "border-slate-600 bg-slate-800 text-slate-500"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      "absolute left-8 top-4 -ml-px h-0.5 w-full -translate-y-1/2",
                      isCompleted ? "bg-indigo-500" : "bg-slate-700"
                    )}
                  />
                )}
              </div>
              <div className="mt-2">
                <span
                  className={cn(
                    "text-sm font-medium",
                    isCurrent || isCompleted ? "text-white" : "text-slate-500"
                  )}
                >
                  {step.title}
                </span>
                {step.description && (
                  <p className="mt-0.5 text-xs text-slate-500">
                    {step.description}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
