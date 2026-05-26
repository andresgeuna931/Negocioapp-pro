'use client';

import { useState, useCallback, useEffect } from 'react';
import {
    ScanLine, Search, Plus, Minus, X, ShoppingCart,
    CreditCard, Banknote, ArrowRight, CheckCircle,
    Tag, User, Scale, Smartphone, Building2
} from 'lucide-react';
import { CustomerSelector } from '@/components/pos/customer-selector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Scanner } from '@/components/sales/scanner';
import { getProducts, getProductByBarcode } from '@/lib/actions/products';
import { createSale } from '@/lib/actions/sales';
import { getPriceLists, type PriceList } from '@/lib/actions/price-lists';
import { getPaymentSettings, type PaymentSettings } from '@/lib/actions/payment-settings';
import { calculateAdjustedPrice } from '@/lib/utils/pricing';
import { formatCurrency } from '@/lib/utils';
import type { Product, CartItem, PaymentMethod, UnitType } from '@/lib/types';

interface CartItemWithPrice extends CartItem {
    adjustedPrice: number;
}

const VARIABLE_UNITS: UnitType[] = ['kg', 'g', 'lt', 'ml'];
const UNIT_LABELS: Record<UnitType, string> = {
    unit: 'unidad', kg: 'kg', g: 'g', lt: 'lt', ml: 'ml',
};

function isVariableUnit(unit: UnitType): boolean {
    return VARIABLE_UNITS.includes(unit);
}

function QuantityModal({ product, adjustedPrice, onConfirm, onCancel }: {
    product: Product;
    adjustedPrice: number;
    onConfirm: (qty: number) => void;
    onCancel: () => void;
}) {
    const [qty, setQty] = useState('');
    const unitLabel = UNIT_LABELS[product.unit_type];
    const numQty = parseFloat(qty) || 0;
    const total = numQty * adjustedPrice;
    const maxQty = product.stock_on_hand;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                        <Scale className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{product.name}</h3>
                        <p className="text-xs text-slate-500">{formatCurrency(adjustedPrice)} por {unitLabel} · Stock: {maxQty} {unitLabel}</p>
                    </div>
                </div>
                <div className="space-y-3">
                    <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Cantidad ({unitLabel})</label>
                        <input
                            type="number"
                            value={qty}
                            onChange={(e) => setQty(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && numQty > 0 && numQty <= maxQty && onConfirm(numQty)}
                            placeholder="Ej: 0.500"
                            step="0.001" min="0.001" max={maxQty} autoFocus
                            className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-lg font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        {numQty > maxQty && <p className="text-xs text-red-500 mt-1">Máximo disponible: {maxQty} {unitLabel}</p>}
                    </div>
                    {numQty > 0 && numQty <= maxQty && (
                        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-600 dark:text-slate-400">Total</span>
                                <span className="text-lg font-bold text-emerald-600">{formatCurrency(total)}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{numQty} {unitLabel} × {formatCurrency(adjustedPrice)}</p>
                        </div>
                    )}
                    <div className="flex gap-2 pt-1">
                        <Button variant="outline" className="flex-1" onClick={onCancel}>Cancelar</Button>
                        <Button className="flex-1" onClick={() => onConfirm(numQty)} disabled={numQty <= 0 || numQty > maxQty}>Agregar al carrito</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function CheckoutModal({ total, paymentSettings, onConfirm, onCancel, processing, onOpenCustomer }: {
    total: number;
    paymentSettings: PaymentSettings | null;
    onConfirm: (method: PaymentMethod, surcharge: number, installments?: number) => void;
    onCancel: () => void;
    processing: boolean;
    onOpenCustomer: () => void;
}) {
    const [showCredit, setShowCredit] = useState(false);

    const debitSurcharge = paymentSettings?.debit_surcharge || 0;
    const credit1Surcharge = paymentSettings?.credit_1_surcharge || 0;
    const credit3Surcharge = paymentSettings?.credit_3_surcharge || 0;

    const calcTotal = (surcharge: number) => total * (1 + surcharge / 100);

    if (showCredit) {
        return (
            <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                    <button onClick={() => setShowCredit(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                    </button>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Seleccioná las cuotas</p>
                </div>

                <Button size="lg" className="w-full" onClick={() => onConfirm('credit', credit1Surcharge, 1)} loading={processing}>
                    <div className="flex items-center gap-2 flex-1">
                        <CreditCard className="w-5 h-5" />
                        <span>1 cuota</span>
                    </div>
                    {credit1Surcharge > 0 && (
                        <span className="text-sm opacity-80">+{credit1Surcharge}% = {formatCurrency(calcTotal(credit1Surcharge))}</span>
                    )}
                </Button>

                <Button size="lg" variant="secondary" className="w-full" onClick={() => onConfirm('credit', credit3Surcharge, 3)} loading={processing}>
                    <div className="flex items-center gap-2 flex-1">
                        <CreditCard className="w-5 h-5" />
                        <span>3 cuotas</span>
                    </div>
                    {credit3Surcharge > 0 && (
                        <span className="text-sm opacity-80">+{credit3Surcharge}% = {formatCurrency(calcTotal(credit3Surcharge))}</span>
                    )}
                </Button>

                <Button variant="ghost" className="w-full" onClick={() => setShowCredit(false)} disabled={processing}>Volver</Button>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <p className="text-sm text-slate-500 text-center">Seleccioná método de pago</p>

            <Button size="lg" className="w-full" onClick={() => onConfirm('cash', 0)} loading={processing}>
                <Banknote className="w-5 h-5 mr-2" />
                Efectivo
            </Button>

            <Button size="lg" variant="secondary" className="w-full" onClick={() => onConfirm('transfer', 0)} loading={processing}>
                <Building2 className="w-5 h-5 mr-2" />
                Transferencia
            </Button>

            <Button size="lg" variant="secondary" className="w-full" onClick={() => onConfirm('transfer', 0)} loading={processing}>
                <Smartphone className="w-5 h-5 mr-2" />
                Código QR
            </Button>

            <Button size="lg" variant="secondary" className="w-full justify-between" onClick={() => onConfirm('debit', debitSurcharge)} loading={processing}>
                <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    <span>Débito</span>
                </div>
                {debitSurcharge > 0 && (
                    <span className="text-sm opacity-80">+{debitSurcharge}% = {formatCurrency(calcTotal(debitSurcharge))}</span>
                )}
            </Button>

            <Button size="lg" variant="secondary" className="w-full justify-between" onClick={() => setShowCredit(true)} loading={processing}>
                <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    <span>Crédito</span>
                </div>
                <span className="text-xs opacity-60">1 o 3 cuotas →</span>
            </Button>

            <Button
                size="lg" variant="outline"
                className="w-full bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 dark:text-orange-300 dark:border-orange-700"
                onClick={onOpenCustomer} loading={processing}
            >
                <User className="w-5 h-5 mr-2" />
                Cuenta Corriente (Fiado)
            </Button>

            <Button variant="ghost" className="w-full" onClick={onCancel} disabled={processing}>Cancelar</Button>
        </div>
    );
}

export default function SalesPage() {
    const [cart, setCart] = useState<CartItemWithPrice[]>([]);
    const [priceLists, setPriceLists] = useState<PriceList[]>([]);
    const [selectedPriceList, setSelectedPriceList] = useState<PriceList | null>(null);
    const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
    const [showScanner, setShowScanner] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [processing, setProcessing] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);
    const [showCustomerSelect, setShowCustomerSelect] = useState(false);
    const [saleComplete, setSaleComplete] = useState<string | null>(null);
    const [lastSaleTotal, setLastSaleTotal] = useState(0);
    const [error, setError] = useState('');
    const [pendingProduct, setPendingProduct] = useState<Product | null>(null);

    useEffect(() => {
        getPriceLists().then(result => {
            if (result.data && result.data.length > 0) {
                setPriceLists(result.data);
                const defaultList = result.data.find(l => l.is_default) || result.data[0];
                setSelectedPriceList(defaultList);
            }
        });
        getPaymentSettings().then(result => {
            if (result.data) setPaymentSettings(result.data);
        });
    }, []);

    const getAdjustedPrice = (product: Product): number => {
        if (!selectedPriceList) return product.price;
        return calculateAdjustedPrice(product.price, selectedPriceList.adjustment_type, selectedPriceList.adjustment_value);
    };

    const total = cart.reduce((sum, item) => sum + item.adjustedPrice * item.qty, 0);

    const handleScan = useCallback(async (barcode: string) => {
        setShowScanner(false);
        setError('');
        const result = await getProductByBarcode(barcode);
        if (result.error) { setError(`Producto no encontrado: ${barcode}`); return; }
        if (result.data) handleProductSelect(result.data);
    }, [selectedPriceList]);

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 2) { setSearchResults([]); return; }
        const result = await getProducts({ search: query, activeOnly: true });
        setSearchResults(result.data || []);
    };

    const handleProductSelect = (product: Product) => {
        setSearchQuery('');
        setSearchResults([]);
        if (isVariableUnit(product.unit_type)) {
            setPendingProduct(product);
        } else {
            addToCart(product, 1);
        }
    };

    const addToCart = (product: Product, qty: number) => {
        if (product.stock_on_hand <= 0) { setError(`${product.name} no tiene stock disponible`); return; }
        const adjustedPrice = getAdjustedPrice(product);
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            const currentQty = existing?.qty || 0;
            const maxAvailable = product.stock_on_hand - currentQty;
            if (maxAvailable <= 0) { setError(`Ya agregaste todo el stock disponible de ${product.name}`); return prev; }
            const qtyToAdd = Math.min(qty, maxAvailable);
            if (existing) return prev.map(item => item.product.id === product.id ? { ...item, qty: item.qty + qtyToAdd, adjustedPrice } : item);
            return [...prev, { product, qty: qtyToAdd, adjustedPrice }];
        });
    };

    useEffect(() => {
        if (selectedPriceList && cart.length > 0) {
            setCart(prev => prev.map(item => ({
                ...item,
                adjustedPrice: calculateAdjustedPrice(item.product.price, selectedPriceList.adjustment_type, selectedPriceList.adjustment_value)
            })));
        }
    }, [selectedPriceList]);

    const updateQty = (productId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.product.id !== productId) return item;
            const newQty = Math.min(Math.max(0, item.qty + delta), item.product.stock_on_hand);
            return { ...item, qty: newQty };
        }).filter(item => item.qty > 0));
    };

    const setQty = (productId: string, qty: number) => {
        if (qty <= 0) { setCart(prev => prev.filter(item => item.product.id !== productId)); return; }
        setCart(prev => prev.map(item => {
            if (item.product.id !== productId) return item;
            return { ...item, qty: Math.min(qty, item.product.stock_on_hand) };
        }));
    };

    const removeFromCart = (productId: string) => setCart(prev => prev.filter(item => item.product.id !== productId));

    const handleCheckout = async (paymentMethod: PaymentMethod, surcharge: number, installments?: number, customerId?: string) => {
        setProcessing(true);
        setError('');
        try {
            const finalTotal = total * (1 + surcharge / 100);
            const result = await createSale({
                items: cart.map(item => ({ product_id: item.product.id, qty: item.qty })),
                payment_method: paymentMethod,
                customer_id: customerId,
                notes: installments ? `Crédito ${installments} cuota${installments > 1 ? 's' : ''} (+${surcharge}%)` : surcharge > 0 ? `Recargo ${surcharge}%` : undefined,
            });
            if (result.error) {
                setError(result.error);
            } else {
                setSaleComplete(result.data);
                setLastSaleTotal(finalTotal);
                setCart([]);
                setShowCheckout(false);
            }
        } catch {
            setError('Error al procesar la venta');
        } finally {
            setProcessing(false);
        }
    };

    const handleNewSale = () => { setSaleComplete(null); setCart([]); setError(''); };

    if (saleComplete) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-6">
                    <CheckCircle className="w-12 h-12 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">¡Venta Completada!</h2>
                <p className="text-slate-500 mb-6">La venta se registró correctamente</p>
                <p className="text-3xl font-bold text-emerald-600 mb-8">{formatCurrency(lastSaleTotal)}</p>
                <Button size="lg" onClick={handleNewSale}>
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Nueva Venta
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {pendingProduct && (
                <QuantityModal
                    product={pendingProduct}
                    adjustedPrice={getAdjustedPrice(pendingProduct)}
                    onConfirm={(qty) => { addToCart(pendingProduct, qty); setPendingProduct(null); }}
                    onCancel={() => setPendingProduct(null)}
                />
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Venta Rápida</h1>
                    <p className="text-slate-500">Escaneá o buscá productos para agregar al carrito</p>
                </div>
                {priceLists.length > 1 && (
                    <div className="flex items-center gap-2">
                        <Tag className="w-5 h-5 text-slate-400" />
                        <select
                            value={selectedPriceList?.id || ''}
                            onChange={(e) => { const list = priceLists.find(l => l.id === e.target.value); if (list) setSelectedPriceList(list); }}
                            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                        >
                            {priceLists.map(list => (
                                <option key={list.id} value={list.id}>
                                    {list.name}{list.adjustment_value !== 0 && (list.adjustment_type === 'percentage' ? ` (${list.adjustment_value > 0 ? '+' : ''}${list.adjustment_value}%)` : ` (${list.adjustment_value > 0 ? '+' : ''}$${list.adjustment_value})`)}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-center justify-between">
                    {error}
                    <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
                </div>
            )}

            {showScanner && <Scanner onScan={handleScan} onClose={() => setShowScanner(false)} />}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-4">
                    <Button size="lg" className="w-full h-20 text-lg" onClick={() => setShowScanner(true)}>
                        <ScanLine className="w-8 h-8 mr-3" />
                        Escanear Producto
                    </Button>

                    <div className="relative">
                        <Input type="search" placeholder="Buscar producto por nombre o código..." value={searchQuery} onChange={(e) => handleSearch(e.target.value)} icon={<Search className="w-5 h-5" />} />
                        {searchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 max-h-80 overflow-auto z-20">
                                {searchResults.map(product => (
                                    <button key={product.id} onClick={() => handleProductSelect(product)} className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left">
                                        <div className="flex-1">
                                            <p className="font-medium text-slate-900 dark:text-white">{product.name}</p>
                                            <p className="text-xs text-slate-400">
                                                {product.barcode && <span className="font-mono mr-2">{product.barcode}</span>}
                                                {isVariableUnit(product.unit_type) && <span className="text-emerald-600 font-medium">Por {UNIT_LABELS[product.unit_type]}</span>}
                                            </p>
                                        </div>
                                        <Badge variant="success">{formatCurrency(product.price)}/{UNIT_LABELS[product.unit_type]}</Badge>
                                        {isVariableUnit(product.unit_type) ? <Scale className="w-5 h-5 text-emerald-600" /> : <Plus className="w-5 h-5 text-emerald-600" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5" />
                                Carrito ({cart.length} productos)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {cart.length === 0 ? (
                                <div className="text-center py-8 text-slate-500">
                                    <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>Escaneá o buscá productos para agregar</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {cart.map(item => (
                                        <div key={item.product.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-slate-900 dark:text-white text-sm">{item.product.name}</p>
                                                <p className="text-sm text-slate-500">
                                                    {formatCurrency(item.adjustedPrice)}/{UNIT_LABELS[item.product.unit_type]}
                                                    {item.adjustedPrice !== item.product.price && <span className="text-xs text-slate-400 line-through ml-2">{formatCurrency(item.product.price)}</span>}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {!isVariableUnit(item.product.unit_type) && (
                                                    <button onClick={() => updateQty(item.product.id, -1)} className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-300 transition-colors">
                                                        <Minus className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <div className="flex flex-col items-center">
                                                    <input
                                                        type="number"
                                                        value={item.qty}
                                                        onChange={(e) => setQty(item.product.id, parseFloat(e.target.value) || 0)}
                                                        className="w-20 h-8 text-center rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-mono"
                                                        step={isVariableUnit(item.product.unit_type) ? 0.001 : 1}
                                                        min={0} max={item.product.stock_on_hand}
                                                    />
                                                    <span className="text-[10px] text-slate-400">máx: {item.product.stock_on_hand} {UNIT_LABELS[item.product.unit_type]}</span>
                                                </div>
                                                {!isVariableUnit(item.product.unit_type) && (
                                                    <button
                                                        onClick={() => updateQty(item.product.id, 1)}
                                                        disabled={item.qty >= item.product.stock_on_hand}
                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${item.qty >= item.product.stock_on_hand ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 hover:bg-emerald-200'}`}
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="text-right w-24">
                                                <p className="font-semibold text-slate-900 dark:text-white">{formatCurrency(item.adjustedPrice * item.qty)}</p>
                                            </div>
                                            <button onClick={() => removeFromCart(item.product.id)} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-1">
                    <Card className="sticky top-20">
                        <CardContent className="p-5">
                            <div className="space-y-4">
                                <div className="text-center py-4 border-b border-slate-200 dark:border-slate-700">
                                    <p className="text-slate-500 text-sm">Total</p>
                                    <p className="text-4xl font-bold text-slate-900 dark:text-white">{formatCurrency(total)}</p>
                                </div>
                                {!showCheckout ? (
                                    <Button size="lg" className="w-full" disabled={cart.length === 0} onClick={() => setShowCheckout(true)}>
                                        Cobrar <ArrowRight className="w-5 h-5 ml-2" />
                                    </Button>
                                ) : (
                                    <CheckoutModal
                                        total={total}
                                        paymentSettings={paymentSettings}
                                        onConfirm={(method, surcharge, installments) => handleCheckout(method, surcharge, installments)}
                                        onCancel={() => setShowCheckout(false)}
                                        processing={processing}
                                        onOpenCustomer={() => setShowCustomerSelect(true)}
                                    />
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <CustomerSelector
                open={showCustomerSelect}
                onOpenChange={setShowCustomerSelect}
                onSelect={(customer) => { setShowCustomerSelect(false); handleCheckout('account', 0, undefined, customer.id); }}
            />
        </div>
    );
}
