import { ConnectButton } from "@rainbow-me/rainbowkit";
import { FaGithub } from "react-icons/fa"; // Font Awesome GitHub logo



export default function Header() {
  return (
    <header className="flex items-center justify-between p-4 shadow-md bg-white">
      {/* Left: Logo + Title + GitHub */}
      <div className="flex items-center gap-3">
        <img src="/tsender-logo.png" alt="TSender Logo" className="h-8 w-8" />
        <h1 className="text-xl font-bold text-gray-800">TSender</h1>

        {/* GitHub link */}
        <a
          href="https://github.com/ub1quit0us"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-600 hover:text-gray-900"
          aria-label="View on GitHub"
        >
          <FaGithub className="h-6 w-6" />
        </a>
      </div>

      {/* Right: Wallet Connect */}
      <ConnectButton />
    </header>
  );
}