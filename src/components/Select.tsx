import type { ComponentPropsWithRef } from "react";
import { select } from "./styles";

type SelectProps = ComponentPropsWithRef<"select">;

export default function Select({
  children,
  className = "",
  ...props
}: SelectProps) {
  return (
    <div className="relative">
      <select {...props} className={`${select} ${className}`}>
        {children}
      </select>

      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-4 top-1/2
                   h-2 w-2 translate-y-[-75%] rotate-45
                   border-b border-r border-slate-600"
      />
    </div>
  );
}
