import { useId, type ReactNode } from "react";

export interface CardProps {
  title?: string;
  // Controls shown beside the title.
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function Card({ title, actions, children, className = "" }: CardProps) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={title ? titleId : undefined}
      className={`flex flex-col gap-4 rounded-lg border-[1.5px] border-ink p-4 md:p-6 ${className}`}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between gap-4">
          {title && (
            <h2 id={titleId} className="text-xl font-semibold">
              {title}
            </h2>
          )}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
