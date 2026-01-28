'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ScannerProps {
    onScan: (code: string) => void;
    onClose: () => void;
}

export function Scanner({ onScan, onClose }: ScannerProps) {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>('starting');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const hasScannedRef = useRef(false);
    const containerId = 'html5-qrcode-scanner';

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

    const stopScanner = useCallback(async () => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
            } catch (e) {
                console.log('Stop error (ignoring):', e);
            }
            try {
                scannerRef.current.clear();
            } catch { }
            scannerRef.current = null;
        }
    }, []);

    const startScanner = useCallback(async () => {
        setStatus('starting');
        setErrorMessage(null);
        hasScannedRef.current = false;

        try {
            await stopScanner();

            // Wait for container to be available
            await new Promise(resolve => setTimeout(resolve, 500));

            const container = document.getElementById(containerId);
            if (!container) {
                throw new Error('Container not found');
            }

            // Create scanner
            const scanner = new Html5Qrcode(containerId, {
                verbose: false,
                formatsToSupport: undefined // Support all formats
            });
            scannerRef.current = scanner;

            // Get cameras
            const cameras = await Html5Qrcode.getCameras();
            console.log('Available cameras:', cameras);

            if (!cameras || cameras.length === 0) {
                throw new Error('No se encontró ninguna cámara');
            }

            // Find back camera
            let cameraId = cameras[cameras.length - 1].id; // Default to last (usually back)
            const backCamera = cameras.find(c =>
                c.label.toLowerCase().includes('back') ||
                c.label.toLowerCase().includes('trasera') ||
                c.label.toLowerCase().includes('rear')
            );
            if (backCamera) {
                cameraId = backCamera.id;
            }

            console.log('Using camera:', cameraId);

            // Start scanning
            await scanner.start(
                cameraId,
                {
                    fps: 10,
                    qrbox: { width: 280, height: 150 }, // Rectangular for barcodes
                    aspectRatio: 1.0,
                },
                (decodedText, decodedResult) => {
                    if (hasScannedRef.current) return;

                    console.log('✅ Scanned:', decodedText, decodedResult.result.format?.formatName);
                    hasScannedRef.current = true;

                    playBeep();
                    stopScanner();
                    onScan(decodedText);
                },
                (errorMessage) => {
                    // Silently ignore scan errors - they happen every frame when no code is visible
                }
            );

            setStatus('scanning');
            console.log('Scanner ready - point at a barcode');

        } catch (err) {
            console.error('Scanner error:', err);
            const msg = err instanceof Error ? err.message : 'Error al acceder a la cámara';

            if (msg.includes('Permission') || msg.includes('NotAllowed') || msg.includes('denied')) {
                setErrorMessage('Permiso de cámara denegado.');
            } else if (msg.includes('NotReadable') || msg.includes('TrackStart')) {
                setErrorMessage('La cámara está siendo usada por otra app.');
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
            <div className="flex-shrink-0 flex items-center justify-between p-4 bg-black z-10">
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
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                {/* Html5Qrcode container - the library renders video inside this */}
                <div
                    id={containerId}
                    ref={containerRef}
                    className="w-full h-full"
                    style={{
                        display: status === 'error' ? 'none' : 'block',
                    }}
                />

                {/* Starting overlay */}
                {status === 'starting' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
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
                <div className="flex-shrink-0 p-4 bg-black">
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
