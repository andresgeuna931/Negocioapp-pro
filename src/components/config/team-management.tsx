'use client';

import { useState } from 'react';
import { Users, UserPlus, Shield, MoreVertical, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { inviteStaffUser, toggleUserActive } from '@/lib/actions/team';
import { toast } from 'sonner';

interface TeamManagementProps {
    team: Profile[];
    currentUserId: string;
    isOwner: boolean;
}

export function TeamManagement({ team, currentUserId, isOwner }: TeamManagementProps) {
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteName, setInviteName] = useState('');
    const [inviteRole, setInviteRole] = useState<UserRole>('staff');
    const [isLoading, setIsLoading] = useState(false);

    const handleInvite = async () => {
        if (!inviteEmail.trim() || !inviteName.trim()) {
            toast.error('Completá todos los campos');
            return;
        }

        setIsLoading(true);
        try {
            const result = await inviteStaffUser(inviteEmail.trim(), inviteName.trim(), inviteRole);

            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success('Invitación enviada correctamente');
                setInviteEmail('');
                setInviteName('');
                setIsInviteOpen(false);
            }
        } catch {
            toast.error('Error al enviar invitación');
        } finally {
            setIsLoading(false);
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
                        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="gap-2">
                                    <UserPlus className="w-4 h-4" />
                                    Agregar
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Agregar Empleado</DialogTitle>
                                </DialogHeader>

                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="invite-name">Nombre</Label>
                                        <Input
                                            id="invite-name"
                                            placeholder="Nombre del empleado"
                                            value={inviteName}
                                            onChange={(e) => setInviteName(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="invite-email">Email</Label>
                                        <Input
                                            id="invite-email"
                                            type="email"
                                            placeholder="empleado@email.com"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                        />
                                    </div>

                                    <Select
                                        label="Rol"
                                        value={inviteRole}
                                        onChange={(e) => setInviteRole(e.target.value as UserRole)}
                                        options={roleOptions}
                                    />

                                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-sm flex gap-2">
                                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="font-medium">Importante</p>
                                            <p>El empleado recibirá un email con instrucciones para crear su cuenta.</p>
                                        </div>
                                    </div>
                                </div>

                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button variant="outline">Cancelar</Button>
                                    </DialogClose>
                                    <Button onClick={handleInvite} disabled={isLoading}>
                                        {isLoading ? 'Enviando...' : 'Enviar Invitación'}
                                    </Button>
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
