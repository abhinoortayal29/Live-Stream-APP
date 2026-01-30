"use client";
import Image from "next/image";
import { Poppins } from "next/font/google";
import Link from "next/link";

const font = Poppins({
  subsets: ["latin"],
  weight: ["200","300","400","500","600","700","800"],
});


export const Logo = () => {
  return (
    <Link href="/" className="hover:opacity-80 transition">
      <div className="flex items-center gap-x-3">
        {/* Logo Icon */}
        <div className="bg-white rounded-full p-1 mr-12 shrink-0 lg:mr-0 lg:shrink">
          <Image
            src="/skoopy.svg"
            alt="Game Hub Logo"
            height={32}
            width={32}
          />
        </div>

        {/* Text */}
        <div className="hidden md:flex flex-col leading-tight">
          <p className="text-lg font-semibold text-foreground">GAME HUB</p>
          <p className="text-sm text-muted-foreground">Let&apos;s play</p>
        </div>
      </div>
    </Link>
  );
};
