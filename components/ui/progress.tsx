import * as React from "react"

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ value = 0, max = 100, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className={`relative h-2 w-full overflow-hidden rounded-full bg-secondary ${className ?? ""}`}
        {...props}
      >
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
        />
      </div>
    )
  }
)
Progress.displayName = "Progress"
