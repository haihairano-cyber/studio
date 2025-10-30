import { GraduationCap } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-card border-b shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground font-headline">
            ProvaFácil
          </h1>
        </div>
      </div>
    </header>
  );
}
