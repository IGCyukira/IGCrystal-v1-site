import Link from "next/link";

export default function NotFound() {
  return (
    <section className="min-h-[100svh] w-full grid place-items-center bg-black text-white">
      <div className="text-center px-6 py-12">
        <h1 className="text-3xl font-semibold">页面走丢了</h1>
        <p className="mt-3 text-white/70">抱歉，未能找到你要访问的内容。</p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-md border border-white/20 bg-white/20 px-4 py-2 text-black backdrop-blur-md hover:bg-white/35 hover:border-white/30 hover:shadow hover:shadow-black/20 transition-colors"
        >
          返回首页
        </Link>
      </div>
    </section>
  );
}


