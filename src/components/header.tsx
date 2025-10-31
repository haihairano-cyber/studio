'use client';
import { GraduationCap, Languages, Settings } from 'lucide-react';
import { useSettings } from '@/hooks/use-settings';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuPortal, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from './ui/dropdown-menu';

export default function Header() {
    const { setLanguage, t } = useSettings();

    return (
        <header className="bg-card border-b shadow-sm">
            <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <GraduationCap className="h-8 w-8 text-primary" />
                    <h1 className="text-2xl font-bold text-foreground font-headline">
                        {t('appName')}
                    </h1>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon">
                            <Settings className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{t('settings')}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                <Languages className="mr-2 h-4 w-4" />
                                <span>{t('language')}</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem onClick={() => setLanguage('en')}>English</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setLanguage('pt-BR')}>Português</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setLanguage('es')}>Español</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setLanguage('fr')}>Français</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setLanguage('de')}>Deutsch</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setLanguage('ru')}>Русский</DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                        </DropdownMenuSub>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
