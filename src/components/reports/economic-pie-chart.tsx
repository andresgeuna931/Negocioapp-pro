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
        <div className="flex flex-col items-center gap-3">
            <div className="relative w-32 h-32">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={38}
                            outerRadius={56}
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
                                fontSize: '12px',
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
                {/* Centro del donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-lg font-bold text-emerald-500 leading-none">{margenPct}%</span>
                    <span className="text-[10px] text-slate-500">margen</span>
                </div>
            </div>

            {/* Leyenda */}
            <div className="w-full space-y-1.5">
                {data.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2 justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
                            <span className="text-[11px] text-slate-400 truncate">{entry.name}</span>
                        </div>
                        <span className="text-[11px] font-semibold text-white flex-shrink-0">{formatCurrency(entry.value)}</span>
                    </div>
                ))}
            </div>

            <p className="text-[10px] text-slate-500 text-center">Solo visible para dueños</p>
        </div>
    );
}
