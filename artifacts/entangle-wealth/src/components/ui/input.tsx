import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps extends React.ComponentProps<"input"> {
  label?: string
  hint?: string
  error?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, hint, error, id, ...props }, ref) => {
    const generatedId = React.useId()
    const inputId = id ?? generatedId

    if (label) {
      return (
        <div className="flex flex-col gap-1.5 w-full">
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
          >
            {label}
          </label>
          <input
            id={inputId}
            type={type}
            className={cn(
              "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm transition-colors duration-150",
              "placeholder:text-muted-foreground/50",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary/50",
              "disabled:cursor-not-allowed disabled:opacity-40",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium",
              error && "border-destructive focus-visible:ring-destructive/50",
              className
            )}
            aria-describedby={hint || error ? `${inputId}-hint` : undefined}
            aria-invalid={!!error}
            ref={ref}
            {...props}
          />
          {(hint || error) && (
            <p
              id={`${inputId}-hint`}
              className={cn(
                "text-xs leading-relaxed",
                error ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {error ?? hint}
            </p>
          )}
        </div>
      )
    }

    return (
      <input
        id={inputId}
        type={type}
        className={cn(
          "flex h-9 w-full border border-input bg-transparent px-3 py-1 text-sm font-mono text-foreground transition-colors duration-150",
          "placeholder:text-muted-foreground/40",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/40",
          "disabled:cursor-not-allowed disabled:opacity-40",
          "file:border-0 file:bg-transparent file:text-sm file:font-mono",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
