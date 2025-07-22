import Link from "next/link";
import Image from "next/image";
import {Button} from "@/components/ui/button";
import {ModeToggle} from "@/components/ModeToggle";

export default function NavBar() {
    return (
        <nav
            className="w-full flex items-center justify-between px-6 py-4 border-b bg-background/80 backdrop-blur-md sticky top-0 z-40">
            <div className="flex items-center gap-3">
                <Link href="/">
          <span className="flex items-center gap-2 font-bold text-xl">
            <Image src="/next.svg" alt="Logo" width={32} height={32} className="dark:invert"/>
            AR Fashion
          </span>
                </Link>
            </div>
            <div className="flex items-center gap-4">
                <Button asChild variant="ghost">
                    <Link href="/">Home</Link>
                </Button>
                <Button asChild variant="ghost">
                    <Link href="/settings">Settings</Link>
                </Button>
                {/* Add more nav links or dropdowns here as needed */}
                <ModeToggle/>
            </div>
        </nav>
    );
} 