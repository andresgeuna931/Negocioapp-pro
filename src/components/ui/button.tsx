import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
        const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl';

        const variants = {
            primary: 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 focus:ring-emerald-500 shadow-lg shadow-emerald-500/25',
            secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 focus:ring-slate-400 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
            outline: 'border-2 border-slate-300 text-slate-700 hover:bg-slate-50 focus:ring-slate-400 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800',
            ghost: 'text-slate-600 hover:bg-slate-100 focus:ring-slate-400 dark:text-slate-300 dark:hover:bg-slate-800',
            danger: 'bg-gradient-to-r from-red-500 to-rose-600 text-white hover:from-red-600 hover:to-rose-700 focus:ring-red-500 shadow-lg shadow-red-500/25',
        };

        const sizes = {
            sm: 'h-9 px-3 text-sm',
            md: 'h-11 px-5 text-base',
            lg: 'h-14 px-8 text-lg',
            icon: 'h-11 w-11',
        };

        return (
            <button
                className={cn(baseStyles, variants[variant], sizes[size], className)}
                ref={ref}
                disabled={disabled || loading}
                {...props}
            >
                {loading && (
                    <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                )}
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';

export { Button };
