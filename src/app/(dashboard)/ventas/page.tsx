'use client';

import { useState, useCallback, useEffect } from 'react';
import {
    ScanLine,
    Search,
    Plus,
    Minus,
    X,
    ShoppingCart,
    CreditCard,
    Banknote,
    ArrowRight,
    CheckCircle,
    Tag,
    User
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
import { calculateAdjustedPrice } from '@/lib/utils/pricing';
import { formatCurrency, formatQuantity } from '@/lib/utils';
import type { Product, CartItem, PaymentMethod } from '@/lib/types';

interface CartItemWithPrice extends CartItem {
    adjustedPrice: number;
}

export default function SalesPage() {
    const [cart, setCart] = useState<CartItemWithPrice[]>([]);
    const [priceLists, setPriceLists] = useState<PriceList[]>([]);
    const [selectedPriceList, setSelectedPriceList] = useState<PriceList | null>(null);
    const [showScanner, setShowScanner] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [searching, setSearching] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);
    const [showCustomerSelect, setShowCustomerSelect] = useState(false);
    const [saleComplete, setSaleComplete] = useState<string | null>(null);
    const [lastSaleTotal, setLastSaleTotal] = useState(0);
    const [error, setError] = useState('');

    // Load price lists on mount
    useEffect(() => {
        const loadPriceLists = async () => {
            const result = await getPriceLists();
            if (result.data && result.data.length > 0) {
                setPriceLists(result.data);
                // Select default list
                const defaultList = result.data.find(l => l.is_default) || result.data[0];
                setSelectedPriceList(defaultList);
            }
        };
        loadPriceLists();
    }, []);

    // Calculate adjusted price for a product
    const getAdjustedPrice = (product: Product): number => {
        if (!selectedPriceList) return product.price;
        return calculateAdjustedPrice(
            product.price,
            selectedPriceList.adjustment_type,
            selectedPriceList.adjustment_value
        );
    };

    // Calculate total using adjusted prices
    const total = cart.reduce((sum, item) => sum + item.adjustedPrice * item.qty, 0);

    // Handle barcode scan
    const handleScan = useCallback(async (barcode: string) => {
        setShowScanner(false);
        setError('');

        const result = await getProductByBarcode(barcode);

        if (result.error) {
            setError(`Producto no encontrado: ${barcode}`);
            return;
        }

        if (result.data) {
            addToCart(result.data);
        }
    }, [selectedPriceList]);

    // Search products
    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        const result = await getProducts({ search: query, activeOnly: true });
        setSearchResults(result.data || []);
        setSearching(false);
    };

    // Add product to cart
    const addToCart = (product: Product, qty: number = 1) => {
        // Check stock availability
        if (product.stock_on_hand <= 0) {
            setError(`${product.name} no tiene stock disponible`);
            return;
        }

        const adjustedPrice = getAdjustedPrice(product);
        setCart((prev) => {
            const existing = prev.find((item) => item.product.id === product.id);
            const currentQty = existing?.qty || 0;
            const maxAvailable = product.stock_on_hand - currentQty;

            if (maxAvailable <= 0) {
                setError(`Ya agregaste todo el stock disponible de ${product.name}`);
                return prev;
            }

            const qtyToAdd = Math.min(qty, maxAvailable);

            if (existing) {
                return prev.map((item) =>
                    item.product.id === product.id
                        ? { ...item, qty: item.qty + qtyToAdd, adjustedPrice }
                        : item
                );
            }
            return [...prev, { product, qty: qtyToAdd, adjustedPrice }];
        });
        setSearchQuery('');
        setSearchResults([]);
    };

    // Recalculate prices when price list changes
    useEffect(() => {
        if (selectedPriceList && cart.length > 0) {
            setCart(prev => prev.map(item => ({
                ...item,
                adjustedPrice: calculateAdjustedPrice(
                    item.product.price,
                    selectedPriceList.adjustment_type,
                    selectedPriceList.adjustment_value
                )
            })));
        }
    }, [selectedPriceList]);

    // Update quantity with stock limit
    const updateQty = (productId: string, delta: number) => {
        setCart((prev) =>
            prev
                .map((item) => {
                    if (item.product.id === productId) {
                        const newQty = item.qty + delta;
                        // Limit to available stock
                        const maxQty = item.product.stock_on_hand;
                        const limitedQty = Math.min(Math.max(0, newQty), maxQty);
                        return { ...item, qty: limitedQty };
                    }
                    return item;
                })
                .filter((item) => item.qty > 0)
        );
    };

    // Set exact quantity with stock limit
    const setQty = (productId: string, qty: number) => {
        if (qty <= 0) {
            setCart((prev) => prev.filter((item) => item.product.id !== productId));
        } else {
            setCart((prev) =>
                prev.map((item) => {
                    if (item.product.id === productId) {
                        // Limit to available stock
                        const maxQty = item.product.stock_on_hand;
                        const limitedQty = Math.min(qty, maxQty);
                        return { ...item, qty: limitedQty };
                    }
                    return item;
                })
            );
        }
    };

    // Remove from cart
    const removeFromCart = (productId: string) => {
        setCart((prev) => prev.filter((item) => item.product.id !== productId));
    };

    // Process sale
    const handleCheckout = async (paymentMethod: PaymentMethod, customerId?: string) => {
        setProcessing(true);
        setError('');

        try {
            const result = await createSale({
                items: cart.map((item) => ({
                    product_id: item.product.id,
                    qty: item.qty,
                })),
                payment_method: paymentMethod,
                customer_id: customerId,
            });

            if (result.error) {
                setError(result.error);
            } else {
                setSaleComplete(result.data);
                setLastSaleTotal(total);
                setCart([]);
                setShowCheckout(false);
            }
        } catch {
            setError('Error al procesar la venta');
        } finally {
            setProcessing(false);
        }
    };

    // Reset after sale
    const handleNewSale = () => {
        setSaleComplete(null);
        setCart([]);
        setError('');
    };

    // Show success screen
    if (saleComplete) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-6">
                    <CheckCircle className="w-12 h-12 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    ¡Venta Completada!
                </h2>
                <p className="text-slate-500 mb-6">
                    La venta se registró correctamente
                </p>
                <p className="text-3xl font-bold text-emerald-600 mb-8">
                    {formatCurrency(lastSaleTotal)}
                </p>
                <Button size="lg" onClick={handleNewSale}>
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Nueva Venta
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        Venta Rápida
                    </h1>
                    <p className="text-slate-500">
                        Escaneá o buscá productos para agregar al carrito
                    </p>
                </div>

                {/* Price List Selector */}
                {priceLists.length > 1 && (
                    <div className="flex items-center gap-2">
                        <Tag className="w-5 h-5 text-slate-400" />
                        <select
                            value={selectedPriceList?.id || ''}
                            onChange={(e) => {
                                const list = priceLists.find(l => l.id === e.target.value);
                                if (list) setSelectedPriceList(list);
                            }}
                            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                        >
                            {priceLists.map(list => (
                                <option key={list.id} value={list.id}>
                                    {list.name}
                                    {list.adjustment_value !== 0 && (
                                        list.adjustment_type === 'percentage'
                                            ? ` (${list.adjustment_value > 0 ? '+' : ''}${list.adjustment_value}%)`
                                            : ` (${list.adjustment_value > 0 ? '+' : ''}$${list.adjustment_value})`
                                    )}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-center justify-between">
                    {error}
                    <button onClick={() => setError('')}>
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Scanner Modal */}
            {showScanner && (
                <Scanner onScan={handleScan} onClose={() => setShowScanner(false)} />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left side - Search and scan */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Scan Button */}
                    <Button
                        size="lg"
                        className="w-full h-20 text-lg"
                        onClick={() => setShowScanner(true)}
                    >
                        <ScanLine className="w-8 h-8 mr-3" />
                        Escanear Producto
                    </Button>

                    {/* Search */}
                    <div className="relative">
                        <Input
                            type="search"
                            placeholder="Buscar producto por nombre o código..."
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            icon={<Search className="w-5 h-5" />}
                        />

                        {/* Search Results Dropdown */}
                        {searchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 max-h-80 overflow-auto z-20">
                                {searchResults.map((product) => (
                                    <button
                                        key={product.id}
                                        onClick={() => addToCart(product)}
                                        className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left"
                                    >
                                        <div className="flex-1">
                                            <p className="font-medium text-slate-900 dark:text-white">
                                                {product.name}
                                            </p>
                                            {product.barcode && (
                                                <p className="text-xs text-slate-400 font-mono">
                                                    {product.barcode}
                                                </p>
                                            )}
                                        </div>
                                        <Badge variant="success">
                                            {formatCurrency(product.price)}
                                        </Badge>
                                        <Plus className="w-5 h-5 text-emerald-600" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Cart Items */}
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
                                    {cart.map((item) => (
                                        <div
                                            key={item.product.id}
                                            className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-slate-900 dark:text-white text-sm leading-tight">
                                                    {item.product.name}
                                                </p>
                                                <p className="text-sm text-slate-500">
                                                    {formatCurrency(item.adjustedPrice)} x {item.product.unit_type}
                                                    {item.adjustedPrice !== item.product.price && (
                                                        <span className="text-xs text-slate-400 line-through ml-2">
                                                            {formatCurrency(item.product.price)}
                                                        </span>
                                                    )}
                                                </p>
                                            </div>

                                            {/* Quantity controls */}
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => updateQty(item.product.id, -1)}
                                                    className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                                                >
                                                    <Minus className="w-4 h-4" />
                                                </button>

                                                <div className="flex flex-col items-center">
                                                    <input
                                                        type="number"
                                                        value={item.qty}
                                                        onChange={(e) => setQty(item.product.id, parseFloat(e.target.value) || 0)}
                                                        className="w-16 h-8 text-center rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                                        step={item.product.unit_type === 'unit' ? 1 : 0.001}
                                                        min={0}
                                                        max={item.product.stock_on_hand}
                                                    />
                                                    <span className="text-[10px] text-slate-400">
                                                        máx: {item.product.stock_on_hand}
                                                    </span>
                                                </div>

                                                <button
                                                    onClick={() => updateQty(item.product.id, 1)}
                                                    disabled={item.qty >= item.product.stock_on_hand}
                                                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${item.qty >= item.product.stock_on_hand
                                                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                                                            : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 hover:bg-emerald-200'
                                                        }`}
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {/* Line total */}
                                            <div className="text-right w-24">
                                                <p className="font-semibold text-slate-900 dark:text-white">
                                                    {formatCurrency(item.adjustedPrice * item.qty)}
                                                </p>
                                            </div>

                                            {/* Remove */}
                                            <button
                                                onClick={() => removeFromCart(item.product.id)}
                                                className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right side - Total and Checkout */}
                <div className="lg:col-span-1">
                    <Card className="sticky top-20">
                        <CardContent className="p-5">
                            <div className="space-y-4">
                                <div className="text-center py-4 border-b border-slate-200 dark:border-slate-700">
                                    <p className="text-slate-500 text-sm">Total</p>
                                    <p className="text-4xl font-bold text-slate-900 dark:text-white">
                                        {formatCurrency(total)}
                                    </p>
                                </div>

                                {!showCheckout ? (
                                    <Button
                                        size="lg"
                                        className="w-full"
                                        disabled={cart.length === 0}
                                        onClick={() => setShowCheckout(true)}
                                    >
                                        Cobrar
                                        <ArrowRight className="w-5 h-5 ml-2" />
                                    </Button>
                                ) : (
                                    <div className="space-y-3">
                                        <p className="text-sm text-slate-500 text-center">
                                            Seleccioná método de pago
                                        </p>

                                        <Button
                                            size="lg"
                                            className="w-full"
                                            onClick={() => handleCheckout('cash')}
                                            loading={processing}
                                        >
                                            <Banknote className="w-5 h-5 mr-2" />
                                            Efectivo
                                        </Button>

                                        <Button
                                            size="lg"
                                            variant="secondary"
                                            className="w-full"
                                            onClick={() => handleCheckout('transfer')}
                                            loading={processing}
                                        >
                                            <CreditCard className="w-5 h-5 mr-2" />
                                            Transferencia
                                        </Button>

                                        <Button
                                            size="lg"
                                            variant="outline"
                                            className="w-full bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 dark:text-orange-300 dark:border-orange-700"
                                            onClick={() => setShowCustomerSelect(true)}
                                            loading={processing}
                                        >
                                            <User className="w-5 h-5 mr-2" />
                                            Cuenta Corriente (Fiado)
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            className="w-full"
                                            onClick={() => setShowCheckout(false)}
                                            disabled={processing}
                                        >
                                            Cancelar
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <CustomerSelector
                open={showCustomerSelect}
                onOpenChange={setShowCustomerSelect}
                onSelect={(customer) => {
                    setShowCustomerSelect(false);
                    // Checkout with account
                    // We need to pass the customer id
                    // Since handleCheckout only takes method, we should update handleCheckout signature or state
                    // Quick fix: call handleCheckout with extra arg if we update signature, or use a state
                    handleCheckout('account', customer.id);
                }}
            />
        </div>
    );
}
