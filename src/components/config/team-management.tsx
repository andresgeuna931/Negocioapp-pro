'use client';

import { useState } from 'react';
import { Users, LinkIcon, Shield, MoreVertical, Copy, Check, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Profile, UserRole } from '@/lib/types';
import { getRoleName } from '@/lib/permissions';
import { generateInviteLink, toggleUserActive } from '@/lib/actions/team';
import { toast } from 'sonner';

interface TeamManagementProps {
    team: Profile[];
    currentUserId: string;
    isOwner: boolean;
}

export function TeamManagement({ team, currentUserId, isOwner }: TeamManagementProps) {
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [inviteRole, setInviteRole] = useState<UserRole>('staff');
    const [isLoading, setIsLoading] = useState(false);
    const [inviteUrl, setInviteUrl] = useState('');
    const [copied, setCopied] = useState(false);

    const handleGenerateLink = async () => {
        setIsLoading(true);
        setInviteUrl('');
        setCopied(false);

        try {
            const result = await generateInviteLink(inviteRole);

            if (result.error) {
                toast.error(result.error);
            } else if (result.inviteUrl) {
                setInviteUrl(result.inviteUrl);
                toast.success('Link generado');
            }
        } catch {
            toast.error('Error al generar el link');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyLink = async () => {
        if (!inviteUrl) return;

        try {
            await navigator.clipboard.writeText(inviteUrl);
            setCopied(true);
            toast.success('¡Link copiado! Mandalo por WhatsApp');
            setTimeout(() => setCopied(false), 3000);
        } catch {
            // Fallback for mobile
            const textArea = document.createElement('textarea');
            textArea.value = inviteUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(true);
            toast.success('¡Link copiado!');
            setTimeout(() => setCopied(false), 3000);
        }
    };

    const handleToggleActive = async (userId: string, currentStatus: boolean) => {
        try {
            const result = await toggleUserActive(userId, !currentStatus);

            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(currentStatus ? 'Usuario desactivado' : 'Usuario activado');
            }
        } catch {
            toast.error('Error al cambiar estado');
        }
    };

    const roleOptions = [
        { value: 'staff', label: '👤 Empleado' },
        { value: 'owner', label: '🛡️ Dueño' },
    ];

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            Equipo
                        </CardTitle>
                        <CardDescription>
                            Usuarios con acceso al sistema
                        </CardDescription>
                    </div>

                    {isOwner && (
                        <Dialog open={isInviteOpen} onOpenChange={(open) => {
                            setIsInviteOpen(open);
                            if (!open) {
                                setInviteUrl('');
                                setCopied(false);
                            }
                        }}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="gap-2">
                                    <LinkIcon className="w-4 h-4" />
                                    Invitar
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Invitar empleado</DialogTitle>
                                </DialogHeader>

                                <div className="space-y-4 py-4">
                                    <p className="text-sm text-slate-500">
                                        Generá un link de invitación y mandalo por WhatsApp.
                                        Tu empleado podrá crear su cuenta y acceder al negocio.
                                    </p>

                                    <Select
                                        label="Rol del empleado"
                                        value={inviteRole}
                                        onChange={(e) => setInviteRole(e.target.value as UserRole)}
                                        options={roleOptions}
                                    />

                                    {!inviteUrl ? (
                                        <Button
                                            onClick={handleGenerateLink}
                                            disabled={isLoading}
                                            className="w-full"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Generando...
                                                </>
                                            ) : (
                                                <>
                                                    <LinkIcon className="w-4 h-4 mr-2" />
                                                    Generar Link de Invitación
                                                </>
                                            )}
                                        </Button>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                                <p className="text-xs text-slate-500 mb-1">Link de invitación:</p>
                                                <p className="text-sm text-slate-900 dark:text-white break-all font-mono">
                                                    {inviteUrl}
                                                </p>
                                            </div>

                                            <Button
                                                onClick={handleCopyLink}
                                                className="w-full"
                                                variant={copied ? 'outline' : undefined}
                                            >
                                                {copied ? (
                                                    <>
                                                        <Check className="w-4 h-4 mr-2 text-emerald-500" />
                                                        ¡Copiado! Mandalo por WhatsApp
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="w-4 h-4 mr-2" />
                                                        Copiar Link
                                                    </>
                                                )}
                                            </Button>

                                            <p className="text-xs text-slate-400 text-center">
                                                ⏰ Este link vence en 7 días
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button variant="outline">Cerrar</Button>
                                    </DialogClose>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </CardHeader>

            <CardContent>
                <div className="space-y-3">
                    {team.map((member) => (
                        <div
                            key={member.id}
                            className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800"
                        >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold">
                                {member.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-900 dark:text-white truncate">
                                    {member.full_name}
                                    {member.id === currentUserId && (
                                        <span className="text-xs text-slate-400 ml-2">(vos)</span>
                                    )}
                                </p>
                                <p className="text-sm text-slate-500 truncate">{member.email}</p>
                            </div>

                            <div className="flex items-center gap-2">
                                <Badge variant={member.role === 'owner' ? 'success' : 'default'}>
                                    {getRoleName(member.role)}
                                </Badge>

                                {!member.is_active && (
                                    <Badge variant="danger">Inactivo</Badge>
                                )}

                                {isOwner && member.id !== currentUserId && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreVertical className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onClick={() => handleToggleActive(member.id, member.is_active)}
                                            >
                                                {member.is_active ? 'Desactivar' : 'Activar'}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </div>
                        </div>
                    ))}

                    {team.length === 0 && (
                        <div className="text-center py-8 text-slate-400">
                            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>No hay miembros del equipo</p>
                        </div>
                    )}
                </div>

                {!isOwner && (
                    <p className="text-xs text-slate-400 mt-4">
                        Solo el dueño puede gestionar el equipo.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
