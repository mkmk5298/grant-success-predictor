"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "gradient"
  size?: "default" | "sm" | "lg"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-xl font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-white/10 text-white backdrop-blur-sm border border-white/20 hover:bg-white/20 active:scale-95": variant === "default",
            "border border-white/30 bg-transparent hover:bg-white/10 active:scale-95": variant === "outline",
            "hover:bg-white/10 active:scale-95": variant === "ghost",
            "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/25 active:scale-95": variant === "gradient",
          },
          {
            "h-10 px-4 py-2 text-sm": size === "sm",
            "h-12 px-6 py-2": size === "default",
            "h-14 px-8 py-3 text-lg": size === "lg",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }