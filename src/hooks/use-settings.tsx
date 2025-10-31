'use client';
import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import translations from '@/lib/i18n';

type Language = 'en' | 'pt-BR';
type Theme = 'blue' | 'green' | 'rose' | 'orange';

interface SettingsContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    theme: Theme;
    setTheme: (theme: Theme) => void;
    t: (key: string, replacements?: { [key: string]: string | number }) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
    const [language, setLanguageState] = useState<Language>('pt-BR');
    const [theme, setThemeState] = useState<Theme>('blue');

    useEffect(() => {
        const storedLang = localStorage.getItem('provaFacilLang') as Language;
        if (storedLang && ['en', 'pt-BR'].includes(storedLang)) {
            setLanguageState(storedLang);
        }

        const storedTheme = localStorage.getItem('provaFacilTheme') as Theme;
        if (storedTheme && ['blue', 'green', 'rose', 'orange'].includes(storedTheme)) {
            setThemeState(storedTheme);
        } else {
             setThemeState('blue');
        }
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('provaFacilLang', lang);
        document.documentElement.lang = lang;
    };

    const setTheme = (theme: Theme) => {
        setThemeState(theme);
        localStorage.setItem('provaFacilTheme', theme);
    };

    useEffect(() => {
        // Remove all theme classes
        document.documentElement.classList.remove('theme-blue', 'theme-green', 'theme-rose', 'theme-orange');
        
        // Add the selected theme class. 'blue' is the default so it doesn't need a class.
        if (theme !== 'blue') {
            document.documentElement.classList.add(`theme-${theme}`);
        }
    }, [theme]);
    
    const t = useMemo(() => (key: string, replacements?: { [key: string]: string | number }) => {
        let translation = translations[language]?.[key] || translations['en']?.[key] || key;
        if (replacements) {
            Object.keys(replacements).forEach(rKey => {
                translation = translation.replace(`{{${rKey}}}`, String(replacements[rKey]));
            });
        }
        return translation;
    }, [language]);


    return (
        <SettingsContext.Provider value={{ language, setLanguage, theme, setTheme, t }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
