import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'glass' | 'gradient';
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, variant = 'default', ...props }, ref) => {
        const variants = {
            default: 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700',
            glass: 'bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border border-white/20',
            gradient: 'bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700',
        };

        return (
            <div
                ref={ref}
                className={cn(
                    'rounded-2xl shadow-sm',
                    variants[variant],
                    className
                )}
                {...props}
            />
        );
    }
);

Card.displayName = 'Card';

const CardHeader = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn('flex flex-col space-y-1.5 p-5', className)}
        {...props}
    />
));

CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h3
        ref={ref}
        className={cn(
            'text-xl font-semibold leading-none tracking-tight text-slate-900 dark:text-white',
            className
        )}
        {...props}
    />
));

CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn('text-sm text-slate-500 dark:text-slate-400', className)}
        {...props}
    />
));

CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-5 pt-0', className)} {...props} />
));

CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn('flex items-center p-5 pt-0', className)}
        {...props}
    />
));

CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
