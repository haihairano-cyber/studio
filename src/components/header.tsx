'use client';
import { GraduationCap, Languages, Palette, Settings } from 'lucide-react';
import { useSettings } from '@/hooks/use-settings';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuPortal, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from './ui/dropdown-menu';

export default function Header() {
    const { setLanguage, setTheme, t } = useSettings();

    const themes = [
        { name: 'blue', label: t('blue') },
        { name: 'green', label: t('green') },
        { name: 'rose', label: t('pink') },
        { name: 'orange', label: t('orange') },
        { name: 'yellow', label: t('yellow') },
        { name: 'black', label: t('black') },
        { name: 'white', label: t('white') },
    ];

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
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                        </DropdownMenuSub>
                         <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                <Palette className="mr-2 h-4 w-4" />
                                <span>{t('colorTheme')}</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                    {themes.map((themeItem) => (
                                        <DropdownMenuItem key={themeItem.name} onClick={() => setTheme(themeItem.name as any)}>
                                            {themeItem.label}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                        </DropdownMenuSub>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
