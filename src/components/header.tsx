'use client';
import { GraduationCap, Cog, Check, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from "next-themes"
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

const languages = [
    { value: 'pt-BR', label: 'Português' },
    { value: 'en-US', label: 'English' },
    { value: 'fr-FR', label: 'Français' },
    { value: 'es-ES', label: 'Español' },
    { value: 'de-DE', label: 'Deutsch' },
    { value: 'ru-RU', label: 'Русский' },
    { value: 'zh-CN', label: '中文' },
];

export default function Header() {
    const [language, setLanguage] = useState('pt-BR');
    const { setTheme } = useTheme()
    
    return (
        <header className="sticky top-0 z-50 w-full border-b bg-white/60 dark:bg-card/60 backdrop-blur-lg border-blue-100 dark:border-blue-900/20">
            <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg text-white shadow-md">
                        <GraduationCap className="h-8 w-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 font-headline">
                        ProvaFácil
                    </h1>
                </div>
                <div className='flex items-center gap-2'>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon">
                          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                          <span className="sr-only">Toggle theme</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setTheme("light")}>
                          Claro
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme("dark")}>
                          Escuro
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme("system")}>
                          Sistema
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon">
                                <Cog className="h-5 w-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56">
                            <DropdownMenuLabel>Configurações</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioGroup value={language} onValueChange={setLanguage}>
                                <DropdownMenuLabel className="font-normal text-muted-foreground">Idioma</DropdownMenuLabel>
                                {languages.map((lang) => (
                                    <DropdownMenuRadioItem key={lang.value} value={lang.value}>
                                        {lang.label}
                                    </DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
}
