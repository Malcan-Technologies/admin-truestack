"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileCheck,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
  Fingerprint,
  FlaskConical,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth-client";
import { useState } from "react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  title: string;
  items: NavItem[];
  collapsible?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

const navSections: NavSection[] = [
  {
    title: "",
    items: [
      { title: "Dashboard", href: "/", icon: LayoutDashboard },
    ],
  },
  {
    title: "CLIENTS",
    items: [
      { title: "All Clients", href: "/clients", icon: Users },
    ],
  },
  {
    title: "TRUEIDENTITY",
    collapsible: true,
    icon: Fingerprint,
    items: [
      { title: "Sessions", href: "/true-identity/sessions", icon: FileCheck },
      { title: "Usage", href: "/true-identity/usage", icon: BarChart3 },
    ],
  },
  {
    title: "ADMIN",
    collapsible: true,
    icon: ShieldCheck,
    items: [
      { title: "Admin Users", href: "/admin-users", icon: ShieldCheck },
    ],
  },
  {
    title: "DEMO",
    collapsible: true,
    icon: FlaskConical,
    items: [
      { title: "TrueIdentity", href: "/demo/trueidentity", icon: Fingerprint },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (title: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/login";
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-slate-800 bg-slate-950">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-slate-800 px-6">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/truestack-white.svg"
            alt="TrueStack"
            width={120}
            height={32}
            className="h-7 w-auto"
            priority
          />
          <span className="text-sm font-medium text-slate-400">Admin</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex h-[calc(100vh-4rem)] flex-col justify-between p-4">
        <div className="space-y-6">
          {navSections.map((section) => (
            <div key={section.title || "main"}>
              {section.title && (
                <button
                  onClick={() => section.collapsible && toggleSection(section.title)}
                  className={cn(
                    "mb-2 flex w-full items-center justify-between px-3 text-xs font-semibold uppercase tracking-wider text-slate-500",
                    section.collapsible && "cursor-pointer hover:text-slate-400"
                  )}
                >
                  <span className="flex items-center gap-2">
                    {section.icon && <section.icon className="h-4 w-4" />}
                    {section.title}
                  </span>
                  {section.collapsible && (
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        collapsedSections[section.title] && "-rotate-90"
                      )}
                    />
                  )}
                </button>
              )}
              {!collapsedSections[section.title] && (
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/" && pathname.startsWith(item.href));
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-indigo-500/10 text-indigo-400"
                            : "text-slate-400 hover:bg-slate-800 hover:text-white"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom section */}
        <div className="space-y-1 border-t border-slate-800 pt-4">
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === "/settings"
                ? "bg-indigo-500/10 text-indigo-400"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            )}
          >
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </Link>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </nav>
    </aside>
  );
}
