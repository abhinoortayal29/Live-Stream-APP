import Image from "next/image";
import { Poppins } from "next/font/google";

const font = Poppins({
  subsets: ["latin"],
  weight: ["200","300","400","500","600","700","800"],
});

export const Logo = () => {
  return (
    <div className="flex flex-col items-center gap-y-4">
      <div className="bg-white rounded-full p-4">
        <Image
          src="/skoopy.svg"
          alt="Gamegub"
          height={80}
          width={80}
        />
      </div>
      <h1 className={`${font.className} text-2xl font-bold text-white`}>Skoopy</h1>

    </div>
  );
};
