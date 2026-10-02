import * as React from "react"
import { cn } from "cn"

// 16px text (no iOS zoom), 44px height, subtle input border; focus is drawn globally.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 text-base text-foreground transition-colors duration-150 ease-out placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive file:inline-flex file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className
      )}
      {...props}
    />
  )
}

export { Input }
