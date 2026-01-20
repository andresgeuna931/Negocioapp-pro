import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, label, error, icon, ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        {label}
                    </label>
                )}
                <div className="relative">
                    {icon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                            {icon}
                        </div>
                    )}
                    <input
                        type={type}
                        className={cn(
                            'flex h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-base transition-all duration-200',
                            'placeholder:text-slate-400',
                            'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500',
                            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-100',
                            'dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:focus:ring-emerald-400',
                            icon && 'pl-11',
                            error && 'border-red-500 focus:ring-red-500 focus:border-red-500',
                            className
                        )}
                        ref={ref}
                        {...props}
                    />
                </div>
                {error && (
                    <p className="mt-1.5 text-sm text-red-500">{error}</p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';

export { Input };
