import Link from "next/link";

export default function NotFound() {
  return (
    <section className="relative min-h-[100svh] w-full grid place-items-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/logo.webp)',
          filter: 'blur(2px) brightness(0.3)'
        }}
      />
      
      {/* Frosted Glass Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      
      {/* Content */}
      <div className="relative z-10 text-center px-6 py-12 text-white">
        <h1 className="text-3xl font-semibold">页面走丢了</h1>
        <p className="mt-3 text-white/70">抱歉，未能找到你要访问的内容。</p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-md border border-white/20 bg-white/60 px-4 py-2 text-black backdrop-blur-md hover:bg-white/40 hover:border-white/45 hover:shadow hover:shadow-black/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-0 dark:text-white dark:bg-black/35 dark:border-white/10 dark:hover:bg-black/50 dark:hover:border-white/20"
          style={{ 
            WebkitTapHighlightColor: 'transparent',
            transition: 'all 0.9s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          返回首页
        </Link>
      </div>
    </section>
  );
}


