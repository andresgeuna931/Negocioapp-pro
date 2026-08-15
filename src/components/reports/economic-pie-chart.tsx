'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface EconomicPieChartProps {
    totalVentas: number;
    costoMercaderia: number;
    gastos: number;
    gananciaNeta: number;
}

const COLORS = {
    ganancia: '#10b981',
    costo: '#3b82f6',
    gastos: '#ef4444',
};

export function EconomicPieChart({ totalVentas, costoMercaderia, gastos, gananciaNeta }: EconomicPieChartProps) {
    const margenPct = totalVentas > 0 ? Math.round((gananciaNeta / totalVentas) * 100) : 0;

    const data = [
        { name: 'Ganancia neta', value: Math.max(gananciaNeta, 0), color: COLORS.ganancia },
        { name: 'Costo mercadería', value: costoMercaderia, color: COLORS.costo },
        { name: 'Gastos', value: gastos, color: COLORS.gastos },
    ].filter(d => d.value > 0);

    if (data.length === 0) return null;

    return (
        <div className="flex flex-col items-center gap-4 w-full">
            {/* Donut más grande */}
            <div className="relative w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={58}
                            outerRadius={82}
                            dataKey="value"
                            startAngle={90}
                            endAngle={-270}
                            strokeWidth={0}
                        >
                            {data.map((entry, index) => (
                                <Cell key={index} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
                            contentStyle={{
                                background: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                                color: 'white',
                                fontSize: '13px',
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
                {/* Centro del donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold text-emerald-500 leading-none">{margenPct}%</span>
                    <span className="text-xs text-slate-400 mt-1">margen neto</span>
                </div>
            </div>

            {/* Leyenda con separadores */}
            <div className="w-full divide-y divide-slate-700">
                {data.map((entry) => (
                    <div key={entry.name} className="flex items-center justify-between py-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: entry.color }} />
                            <span className="text-sm text-slate-300 truncate">{entry.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-white flex-shrink-0 ml-3">{formatCurrency(entry.value)}</span>
                    </div>
                ))}
            </div>

            <p className="text-xs text-slate-500 text-center">Solo visible para dueños</p>
        </div>
    );
}
