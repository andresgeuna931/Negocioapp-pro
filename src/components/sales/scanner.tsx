'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Camera, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ScannerProps {
    onScan: (code: string) => void;
    onClose: () => void;
}

// Dynamic import for zxing to handle SSR
let BrowserMultiFormatReader: typeof import('@zxing/library').BrowserMultiFormatReader | null = null;

export function Scanner({ onScan, onClose }: ScannerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const scanningRef = useRef(false);
    const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>('starting');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const stopScanner = useCallback(() => {
        scanningRef.current = false;
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    const startScanner = useCallback(async () => {
        setStatus('starting');
        setErrorMessage(null);

        try {
            // Stop any existing scanner
            stopScanner();

            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error('Tu navegador no soporta acceso a cámara');
            }

            // Load zxing dynamically
            if (!BrowserMultiFormatReader) {
                const zxing = await import('@zxing/library');
                BrowserMultiFormatReader = zxing.BrowserMultiFormatReader;
            }

            // Request camera permission and get stream
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            streamRef.current = stream;

            // Attach stream to video element
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            setStatus('scanning');
            scanningRef.current = true;

            // Create reader instance
            const reader = new BrowserMultiFormatReader();

            // Start scanning loop
            const scanLoop = async () => {
                if (!scanningRef.current || !videoRef.current) return;

                try {
                    const result = await reader.decodeFromVideoElement(videoRef.current);
                    if (result) {
                        const code = result.getText();
                        console.log('Scanned:', code);

                        // Play beep
                        try {
                            const audioCtx = new AudioContext();
                            const oscillator = audioCtx.createOscillator();
                            oscillator.type = 'sine';
                            oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
                            oscillator.connect(audioCtx.destination);
                            oscillator.start();
                            oscillator.stop(audioCtx.currentTime + 0.15);
                        } catch { }

                        stopScanner();
                        onScan(code);
                        return;
                    }
                } catch {
                    // Decode failed - no barcode in view, continue scanning
                }

                // Continue scanning
                if (scanningRef.current) {
                    requestAnimationFrame(scanLoop);
                }
            };

            // Start the scan loop
            scanLoop();

        } catch (err) {
            console.error('Scanner error:', err);
            const msg = err instanceof Error ? err.message : 'Error al acceder a la cámara';

            if (msg.includes('Permission') || msg.includes('NotAllowed') || msg.includes('denied')) {
                setErrorMessage('Permiso de cámara denegado. Por favor, permití el acceso.');
            } else {
                setErrorMessage(msg);
            }
            setStatus('error');
        }
    }, [onScan, stopScanner]);

    useEffect(() => {
        const timer = setTimeout(() => {
            startScanner();
        }, 300);

        return () => {
            clearTimeout(timer);
            stopScanner();
        };
    }, [startScanner, stopScanner]);

    const handleClose = () => {
        stopScanner();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 bg-black/80">
                <div className="text-white">
                    <h2 className="font-bold text-lg">Escanear Código</h2>
                    <p className="text-white/70 text-sm">
                        {status === 'starting' && 'Iniciando cámara...'}
                        {status === 'scanning' && 'Apuntá al código de barras'}
                        {status === 'error' && 'Error de cámara'}
                    </p>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClose}
                    className="text-white hover:bg-white/20"
                >
                    <X className="w-6 h-6" />
                </Button>
            </div>

            {/* Scanner Area */}
            <div className="flex-1 relative overflow-hidden">
                {/* Video element - always present */}
                <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-cover"
                    playsInline
                    muted
                    autoPlay
                />

                {/* Scan overlay */}
                {status === 'scanning' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-64 h-64 border-2 border-white/30 rounded-2xl relative">
                            {/* Corner markers */}
                            <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                            <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                            <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
                            {/* Scan line */}
                            <div className="absolute inset-x-4 top-1/2 h-0.5 bg-emerald-400 animate-pulse" />
                        </div>
                    </div>
                )}

                {/* Starting state */}
                {status === 'starting' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black">
                        <div className="text-center text-white">
                            <Camera className="w-16 h-16 mx-auto mb-4 animate-pulse" />
                            <p className="text-lg">Iniciando cámara...</p>
                            <p className="text-white/60 text-sm mt-2">
                                Si aparece un mensaje, tocá "Permitir"
                            </p>
                        </div>
                    </div>
                )}

                {/* Error state */}
                {status === 'error' && (
                    <div className="absolute inset-0 flex items-center justify-center p-6 bg-black">
                        <div className="text-center text-white max-w-sm">
                            <Camera className="w-16 h-16 mx-auto mb-4 text-red-400" />
                            <p className="text-red-400 text-lg mb-4">{errorMessage}</p>
                            <div className="bg-white/10 rounded-lg p-4 mb-4 text-left text-sm">
                                <p className="font-medium mb-2">Para habilitar la cámara:</p>
                                <ol className="list-decimal list-inside space-y-1 text-white/80">
                                    <li>Tocá el ícono de candado en la barra</li>
                                    <li>Buscá "Cámara" y cambiá a "Permitir"</li>
                                    <li>Recargá la página</li>
                                </ol>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    onClick={startScanner}
                                    className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                                >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Reintentar
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleClose}
                                    className="flex-1 border-white/30 text-white hover:bg-white/20"
                                >
                                    Cerrar
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            {status === 'scanning' && (
                <div className="flex-shrink-0 p-4 bg-black/80">
                    <Button
                        variant="outline"
                        className="w-full border-white/30 text-white hover:bg-white/20"
                        onClick={handleClose}
                    >
                        Cancelar
                    </Button>
                </div>
            )}
        </div>
    );
}
