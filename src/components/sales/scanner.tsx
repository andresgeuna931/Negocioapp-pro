'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Camera, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ScannerProps {
    onScan: (code: string) => void;
    onClose: () => void;
}

export function Scanner({ onScan, onClose }: ScannerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const readerRef = useRef<import('@zxing/library').BrowserMultiFormatReader | null>(null);
    const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>('starting');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const hasScannedRef = useRef(false);

    const stopScanner = useCallback(() => {
        hasScannedRef.current = true;
        if (readerRef.current) {
            readerRef.current.reset();
            readerRef.current = null;
        }
    }, []);

    const playBeep = () => {
        try {
            const audioCtx = new AudioContext();
            const oscillator = audioCtx.createOscillator();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
            oscillator.connect(audioCtx.destination);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.15);
        } catch { }
    };

    const startScanner = useCallback(async () => {
        setStatus('starting');
        setErrorMessage(null);
        hasScannedRef.current = false;

        try {
            // Stop any existing scanner
            stopScanner();

            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error('Tu navegador no soporta acceso a cámara');
            }

            // Load zxing dynamically
            const { BrowserMultiFormatReader } = await import('@zxing/library');

            const reader = new BrowserMultiFormatReader();
            readerRef.current = reader;

            // Get available video devices
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === 'videoinput');

            if (videoDevices.length === 0) {
                throw new Error('No se encontró ninguna cámara');
            }

            console.log('Video devices:', videoDevices);

            // Try to find back camera
            let deviceId: string | undefined = undefined;
            const backCamera = videoDevices.find(d =>
                d.label.toLowerCase().includes('back') ||
                d.label.toLowerCase().includes('trasera') ||
                d.label.toLowerCase().includes('rear') ||
                d.label.toLowerCase().includes('environment')
            );
            if (backCamera) {
                deviceId = backCamera.deviceId;
            } else if (videoDevices.length > 0) {
                // On mobile, usually the last camera is the back one
                deviceId = videoDevices[videoDevices.length - 1].deviceId;
            }

            console.log('Using device:', deviceId);

            // Start continuous decoding from video device
            await reader.decodeFromVideoDevice(
                deviceId || null,
                videoRef.current!,
                (result, error) => {
                    if (hasScannedRef.current) return;

                    if (result) {
                        const code = result.getText();
                        console.log('✅ Scanned:', code);

                        hasScannedRef.current = true;
                        playBeep();
                        stopScanner();
                        onScan(code);
                    }

                    // Log errors occasionally for debugging (but not every frame)
                    if (error && Math.random() < 0.01) {
                        console.log('Scanning...', error.message);
                    }
                }
            );

            setStatus('scanning');
            console.log('Scanner started - point at a barcode');

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
            <div className="flex-shrink-0 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-10">
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
                {/* Video element */}
                <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-cover"
                    playsInline
                    muted
                />

                {/* Scan overlay */}
                {status === 'scanning' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-72 h-48 border-2 border-white/30 rounded-2xl relative">
                            {/* Corner markers */}
                            <div className="absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                            <div className="absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                            <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                            <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
                            {/* Scan line animation */}
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
                <div className="flex-shrink-0 p-4 bg-gradient-to-t from-black/80 to-transparent absolute bottom-0 left-0 right-0">
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
