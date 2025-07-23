'use client';

export function HeroTitle() {
  return (
    <div className="space-y-4">
      <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
        <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
          AR Fashion
        </span>
        <br />
        <span className="text-foreground">Try-On Studio</span>
      </h1>
      <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
        Experience the future of online shopping with our revolutionary AR try-on technology. See
        how clothes look on you before you buy.
      </p>
    </div>
  );
}
