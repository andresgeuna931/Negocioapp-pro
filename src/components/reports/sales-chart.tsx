'use client';

import { useEffect, useState } from 'react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

interface SalesChartProps {
    data: { date: string; total: number; count: number }[];
    title: string;
    chartType: 'area' | 'bar';
}

function formatYAxis(val: number): string {
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1).replace('.', ',')}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
    return `$${val}`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const labelStr = String(label ?? '');
        const parts = labelStr.split('-');
        const fechaFormateada = parts.length === 3
            ? `${parts[2]}/${parts[1]}/${parts[0]}`
            : labelStr;
        return (
            <div className="rounded-lg border bg-white p-3 shadow-sm dark:bg-slate-950 dark:border-slate-800 text-sm">
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col">
                        <span className="text-[0.70rem] uppercase text-slate-500">Fecha</span>
                        <span className="font-bold text-slate-900 dark:text-slate-50">{fechaFormateada}</span>
                    </div>
                    <div className="flex flex-col text-right">
                        <span className="text-[0.70rem] uppercase text-slate-500">Venta</span>
                        <span className="font-bold text-emerald-600">
                            {formatCurrency(payload[0].value as number)}
                        </span>
                    </div>
                </div>
                {payload[0].payload.count > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-slate-500 text-xs text-center">
                        {payload[0].payload.count} {payload[0].payload.count === 1 ? 'venta' : 'ventas'}
                    </div>
                )}
            </div>
        );
    }
    return null;
};

const commonAxisProps = {
    stroke: '#888888',
    fontSize: 11,
    tickLine: false,
    axisLine: false,
};

export function SalesChart({ data, title, chartType }: SalesChartProps) {
    const [isPrinting, setIsPrinting] = useState(false);

    useEffect(() => {
        const onBeforePrint = () => setIsPrinting(true);
        const onAfterPrint = () => setIsPrinting(false);
        window.addEventListener('beforeprint', onBeforePrint);
        window.addEventListener('afterprint', onAfterPrint);
        return () => {
            window.removeEventListener('beforeprint', onBeforePrint);
            window.removeEventListener('afterprint', onAfterPrint);
        };
    }, []);

    if (!data || data.length === 0) return null;

    const xAxisFormatter = (str: string) => {
        const parts = String(str).split('-');
        return `${parts[2]}/${parts[1]}`;
    };

    // Al imprimir usamos ancho fijo para que Recharts renderice bien
    const chartWidth = isPrinting ? 700 : undefined;
    const chartHeight = isPrinting ? 250 : '100%';

    const sharedChart = chartType === 'area' ? (
        <AreaChart data={data} width={chartWidth} height={isPrinting ? 250 : undefined} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
            <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
            </defs>
            <XAxis dataKey="date" tickFormatter={xAxisFormatter} interval="preserveStartEnd" {...commonAxisProps} />
            <YAxis tickFormatter={formatYAxis} width={60} {...commonAxisProps} />
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
        </AreaChart>
    ) : (
        <BarChart data={data} width={chartWidth} height={isPrinting ? 250 : undefined} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
            <XAxis dataKey="date" tickFormatter={xAxisFormatter} interval="preserveStartEnd" {...commonAxisProps} />
            <YAxis tickFormatter={formatYAxis} width={60} {...commonAxisProps} />
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
    );

    return (
        <Card className="col-span-1 lg:col-span-4">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent className="pl-0">
                {isPrinting ? (
                    <div style={{ width: 700, height: 250 }}>
                        {sharedChart}
                    </div>
                ) : (
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            {sharedChart}
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
