import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { LoadingSpinner } from "./loading-spinner"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover shadow-md hover:shadow-lg hover:shadow-primary/20 active:bg-primary-active",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md hover:shadow-lg hover:shadow-destructive/20 focus-visible:ring-destructive/50",
        outline:
          "border-2 border-border bg-background hover:bg-accent hover:text-accent-foreground hover:border-border-hover shadow-sm hover:shadow-md",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary-hover shadow-sm hover:shadow-md",
        ghost:
          "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary-hover",
        success:
          "bg-success text-success-foreground hover:bg-success/90 shadow-md hover:shadow-lg hover:shadow-success/20",
        warning:
          "bg-warning text-warning-foreground hover:bg-warning/90 shadow-md hover:shadow-lg hover:shadow-warning/20",
        gradient:
          "bg-gradient-to-r from-primary via-accent to-primary text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:from-primary-hover hover:via-accent-hover hover:to-primary-hover",
        "glass":
          "backdrop-blur-xl bg-background/80 border border-border/50 hover:bg-background/90 shadow-lg",
      },
      size: {
        default: "h-10 px-5 py-2.5 has-[>svg]:px-4",
        sm: "h-8 rounded-md gap-1.5 px-3 text-xs has-[>svg]:px-2.5",
        lg: "h-12 rounded-xl px-8 text-base has-[>svg]:px-6",
        icon: "size-10",
        "icon-sm": "size-8",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  loadingText,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button"

  // Determine spinner variant based on button variant
  const spinnerVariant =
    variant === 'gradient' || variant === 'default' || variant === 'success' || variant === 'warning'
      ? 'white'
      : 'primary';

  // Determine spinner size based on button size
  const spinnerSize = size === 'lg' ? 'md' : size === 'sm' ? 'sm' : 'sm';

  // If asChild is true, don't modify children (Slot expects single child)
  if (asChild) {
    return (
      <Comp
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={loading || disabled}
        {...props}
      >
        {children}
      </Comp>
    )
  }

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={loading || disabled}
      {...props}
    >
      {loading && (
        <LoadingSpinner size={spinnerSize} variant={spinnerVariant} />
      )}
      {loading ? (loadingText || children) : children}
    </Comp>
  )
}

export { Button, buttonVariants }
