'use client';
import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import translations from '@/lib/i18n';

type Language = 'en' | 'pt-BR' | 'es' | 'fr' | 'de' | 'ru';

interface SettingsContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string, replacements?: { [key: string]: string | number }) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
    const [language, setLanguageState] = useState<Language>('pt-BR');
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        try {
            const storedLang = localStorage.getItem('provaFacilLang') as Language;
            if (storedLang && ['en', 'pt-BR', 'es', 'fr', 'de', 'ru'].includes(storedLang)) {
                setLanguageState(storedLang);
                document.documentElement.lang = storedLang;
            }
        } catch (error) {
            console.error("Failed to access localStorage", error);
        }
    }, []);

    useEffect(() => {
        if (isMounted) {
            try {
                localStorage.setItem('provaFacilLang', language);
                document.documentElement.lang = language;
            } catch (error) {
                 console.error("Failed to save language to localStorage", error);
            }
        }
    }, [language, isMounted]);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
    };

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
        <SettingsContext.Provider value={{ language, setLanguage, t }}>
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
