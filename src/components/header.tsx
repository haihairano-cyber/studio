'use client';
import { GraduationCap } from 'lucide-react';

export default function Header() {
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
            </div>
        </header>
    );
}
