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
    const [error, setError] = useState<string | null>(null);
    const [isStarting, setIsStarting] = useState(true);
    const [permissionDenied, setPermissionDenied] = useState(false);

    const startScanner = useCallback(async () => {
        setIsStarting(true);
        setError(null);
        setPermissionDenied(false);

        try {
            // First check if camera is available
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Tu navegador no soporta acceso a cámara');
            }

            // Get available cameras
            const devices = await navigator.mediaDevices.enumerateDevices();
            const cameras = devices.filter(d => d.kind === 'videoinput');

            if (cameras.length === 0) {
                throw new Error('No se encontró ninguna cámara');
            }

            console.log('Cameras found:', cameras.length);

            // Stop existing scanner if any
            if (scannerRef.current) {
                try {
                    await scannerRef.current.stop();
                } catch {
                    // Ignore stop errors
                }
                scannerRef.current = null;
            }

            // Small delay to ensure DOM is ready
            await new Promise(resolve => setTimeout(resolve, 300));

            const html5QrCode = new Html5Qrcode('scanner-container');
            scannerRef.current = html5QrCode;

            // Use back camera if available, otherwise fall back to any camera
            const cameraConfig = cameras.length > 1
                ? { facingMode: 'environment' }
                : { deviceId: cameras[0].deviceId };

            await html5QrCode.start(
                cameraConfig,
                {
                    fps: 10,
                    qrbox: { width: 200, height: 200 },
                    aspectRatio: 1,
                    disableFlip: false,
                },
                (decodedText) => {
                    // Play beep sound
                    try {
                        const audio = new AudioContext();
                        const oscillator = audio.createOscillator();
                        oscillator.type = 'sine';
                        oscillator.frequency.setValueAtTime(880, audio.currentTime);
                        oscillator.connect(audio.destination);
                        oscillator.start();
                        oscillator.stop(audio.currentTime + 0.1);
                    } catch {
                        // Ignore audio errors
                    }

                    // Close and return result
                    onScan(decodedText);
                },
                () => {
                    // Ignore errors during scanning
                }
            );

            console.log('Scanner started successfully');
            setIsStarting(false);
        } catch (err) {
            console.error('Scanner error:', err);
            const errorMessage = err instanceof Error ? err.message : 'Error al iniciar la cámara';

            // Check for permission denied
            if (errorMessage.includes('Permission') || errorMessage.includes('NotAllowed')) {
                setPermissionDenied(true);
            }

            setError(errorMessage);
            setIsStarting(false);
        }
    }, [onScan]);

    useEffect(() => {
        startScanner();

        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => { });
            }
        };
    }, [startScanner]);

    const handleRetry = () => {
        startScanner();
    };

    return (
        <div className="fixed inset-0 z-50 bg-black">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent">
                <div className="flex items-center justify-between">
                    <div className="text-white">
                        <h2 className="font-bold text-lg">Escanear Código</h2>
                        <p className="text-white/70 text-sm">Apuntá al código de barras</p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="text-white hover:bg-white/20"
                    >
                        <X className="w-6 h-6" />
                    </Button>
                </div>
            </div>

            {/* Scanner */}
            <div className="flex items-center justify-center h-full">
                {isStarting && (
                    <div className="text-center text-white">
                        <Camera className="w-12 h-12 mx-auto mb-4 animate-pulse" />
                        <p>Iniciando cámara...</p>
                        <p className="text-white/60 text-sm mt-2">
                            Si aparece un mensaje, tocá "Permitir"
                        </p>
                    </div>
                )}

                {error && (
                    <div className="text-center text-white p-6 max-w-sm">
                        <Camera className="w-12 h-12 mx-auto mb-4 text-red-400" />
                        <p className="text-red-400 mb-4">{error}</p>

                        {permissionDenied && (
                            <div className="bg-white/10 rounded-lg p-4 mb-4 text-left text-sm">
                                <p className="font-medium mb-2">Para habilitar la cámara:</p>
                                <ol className="list-decimal list-inside space-y-1 text-white/80">
                                    <li>Tocá el ícono de candado en la barra de direcciones</li>
                                    <li>Buscá "Cámara" y cambiá a "Permitir"</li>
                                    <li>Recargá la página</li>
                                </ol>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <Button
                                onClick={handleRetry}
                                className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Reintentar
                            </Button>
                            <Button
                                variant="outline"
                                onClick={onClose}
                                className="flex-1 border-white/30 text-white hover:bg-white/20"
                            >
                                Cerrar
                            </Button>
                        </div>
                    </div>
                )}

                <div
                    id="scanner-container"
                    className="w-full max-w-md aspect-square relative overflow-hidden"
                    style={{
                        display: isStarting || error ? 'none' : 'block',
                        minHeight: '300px',
                        zIndex: 1
                    }}
                />
            </div>

            {/* Overlay guide */}
            {!isStarting && !error && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-64 h-64 border-2 border-white/50 rounded-2xl relative">
                        {/* Corner markers */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />

                        {/* Scan line animation */}
                        <div className="absolute inset-x-4 top-1/2 h-0.5 bg-emerald-400 animate-pulse" />
                    </div>
                </div>
            )}

            {/* Footer */}
            {!error && (
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                    <Button
                        variant="outline"
                        className="w-full border-white/30 text-white hover:bg-white/20"
                        onClick={onClose}
                    >
                        Cancelar
                    </Button>
                </div>
            )}
        </div>
    );
}

