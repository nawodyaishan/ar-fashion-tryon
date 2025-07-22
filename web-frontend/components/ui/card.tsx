import * as React from "react"
import {cn} from "@/lib/utils"

const Card = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({className, ...props}, ref) => (
    <div
        ref={ref}
        className={cn(
            "bg-background border rounded-xl shadow-sm p-6 flex flex-col gap-4 transition-shadow hover:shadow-lg",
            className
        )}
        {...props}
    />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({className, ...props}, ref) => (
    <div
        ref={ref}
        className={cn("mb-2 text-lg font-semibold", className)}
        {...props}
    />
))
CardHeader.displayName = "CardHeader"

const CardContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({className, ...props}, ref) => (
    <div ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({className, ...props}, ref) => (
    <div ref={ref} className={cn("mt-4", className)} {...props} />
))
CardFooter.displayName = "CardFooter"

export {Card, CardHeader, CardContent, CardFooter}