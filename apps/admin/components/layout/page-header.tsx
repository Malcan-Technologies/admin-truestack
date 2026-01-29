interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, children, actions }: PageHeaderProps) {
  const actionContent = actions || children;
  return (
    <div className="mb-8 flex items-start justify-between">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
          <span className="bg-linear-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
            {title}
          </span>
        </h1>
        {description && (
          <p className="mt-2 text-slate-400">{description}</p>
        )}
      </div>
      {actionContent && <div className="flex items-center gap-3">{actionContent}</div>}
    </div>
  );
}
