'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { X, Camera, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ScannerProps {
    onScan: (code: string) => void;
    onClose: () => void;
}

export function Scanner({ onScan, onClose }: ScannerProps) {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>('starting');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const containerIdRef = useRef(`scanner-${Date.now()}`);

    const stopScanner = useCallback(async () => {
        if (scannerRef.current) {
            try {
                const state = scannerRef.current.getState();
                if (state === Html5QrcodeScannerState.SCANNING) {
                    await scannerRef.current.stop();
                }
            } catch (e) {
                console.log('Stop scanner error (ignoring):', e);
            }
            scannerRef.current = null;
        }
    }, []);

    const startScanner = useCallback(async () => {
        setStatus('starting');
        setErrorMessage(null);

        try {
            // Stop any existing scanner
            await stopScanner();

            // Check camera support
            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error('Tu navegador no soporta acceso a cámara');
            }

            // Get container element
            const container = document.getElementById(containerIdRef.current);
            if (!container) {
                throw new Error('Contenedor no encontrado');
            }

            // Create scanner instance
            const scanner = new Html5Qrcode(containerIdRef.current);
            scannerRef.current = scanner;

            // Get cameras
            const cameras = await Html5Qrcode.getCameras();
            if (!cameras || cameras.length === 0) {
                throw new Error('No se encontró ninguna cámara');
            }

            console.log('Available cameras:', cameras);

            // Prefer back camera
            let cameraId = cameras[0].id;
            const backCamera = cameras.find(c =>
                c.label.toLowerCase().includes('back') ||
                c.label.toLowerCase().includes('trasera') ||
                c.label.toLowerCase().includes('environment')
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
                    qrbox: { width: 250, height: 250 },
                },
                (decodedText) => {
                    console.log('Scanned:', decodedText);

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

                    onScan(decodedText);
                },
                () => { }
            );

            console.log('Scanner started successfully');
            setStatus('scanning');

        } catch (err) {
            console.error('Scanner error:', err);
            const msg = err instanceof Error ? err.message : 'Error desconocido';
            setErrorMessage(msg);
            setStatus('error');
        }
    }, [onScan, stopScanner]);

    useEffect(() => {
        // Small delay to ensure DOM is mounted
        const timer = setTimeout(() => {
            startScanner();
        }, 500);

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
            <div className="flex items-center justify-between p-4 bg-black/80">
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
            <div className="flex-1 flex items-center justify-center p-4">
                {status === 'starting' && (
                    <div className="text-center text-white">
                        <Camera className="w-16 h-16 mx-auto mb-4 animate-pulse" />
                        <p className="text-lg">Iniciando cámara...</p>
                        <p className="text-white/60 text-sm mt-2">
                            Si aparece un mensaje, tocá "Permitir"
                        </p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="text-center text-white p-6 max-w-sm">
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
                )}

                {/* Video container - always render but hide when not scanning */}
                <div
                    id={containerIdRef.current}
                    className={`w-full max-w-sm ${status === 'scanning' ? 'block' : 'hidden'}`}
                    style={{
                        minHeight: '300px',
                        maxHeight: '60vh'
                    }}
                />
            </div>

            {/* Footer */}
            {status === 'scanning' && (
                <div className="p-4 bg-black/80">
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
