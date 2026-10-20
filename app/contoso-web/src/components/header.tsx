import Image from "next/image";
import Link from "next/link";
import Block from "@/components/block";
import { Bars3Icon } from "@heroicons/react/24/outline";

export const Header = async () => {

  const user = {
    name: "Sarah Lee",
    email: "sarahlee@example.com",
    image: "/people/sarahlee.jpg",
  };

  return (
    <Block
      outerClassName=""
      innerClassName="h-12 flex flex-row center items-center"
    >
      <div className="text-slate-800">
        <Link href="/" aria-label="Home">
          <Bars3Icon className="w-6" />
        </Link>
      </div>
      <div className="grow">&nbsp;</div>
      <div className="flex flex-row items-center gap-3">
        <div>
          <div className="text-right font-semibold text-zinc-600">
            {user.name}
          </div>
          <div className="text-right text-xs text-zinc-400">{user.email}</div>
        </div>
        <div className="">
          <Image
            src={user.image}
            width={32}
            height={32}
            alt={user.name}
            className="rounded-full"
          />
        </div>
      </div>
    </Block>
  );
};

export default Header;
