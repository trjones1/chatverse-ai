import Link from "next/link";
import { getBuildDisplay } from "@/lib/buildInfo";

export default function FooterLegal() {
  const year = new Date().getFullYear();
  const brand = process.env.NEXT_PUBLIC_BRAND_NAME || "ChatVerse";
  return (
    <footer className="mt-16 border-t border-black/10 dark:border-white/10 py-8">
      <div className="mx-auto max-w-6xl px-4 text-sm text-gray-600 dark:text-gray-300">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-x-4">
            <Link href="/terms" className="hover:underline">Terms of Service</Link>
            <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
            <Link href="/faq" className="hover:underline">FAQ</Link>
            <Link href="/help" className="hover:underline">Help</Link>
            <Link href="/dmca" className="hover:underline">DMCA</Link>
            <Link href="/contact" className="hover:underline">Contact</Link>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            © {year} <Link href="https://chatverse.ai" target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-gray-800 dark:hover:text-gray-100 transition-colors">{brand}</Link>. All rights reserved.
            <div className="mt-1 font-mono text-[10px] opacity-60">
              {getBuildDisplay()}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}