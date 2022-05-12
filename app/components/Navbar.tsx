import { Link } from "@remix-run/react";

export default function NavBar() {
  return (
    <header className="bg-pl-darkPurple p-4 font-sans text-lg font-medium text-white">
      <nav className="align-items border-p-2 container mx-auto flex items-center justify-center gap-8">
        <Link
          to="/join"
          className="border-b-2 border-transparent hover:border-pl-pink hover:text-pl-pink"
        >
          Sign up
        </Link>
        <Link
          to="/"
          aria-label="Back to homepage"
          className="group relative flex flex-col items-center border-b-2 border-transparent hover:text-pl-pink"
        >
          <svg width="192" viewBox="0 0 192 72">
            <path
              id="curve"
              d="M 0,0 C 0,96 192,96 192,0"
              fill="none"
              stroke="none"
            />
            <text
              x="20"
              className="fill-current tracking-wider group-hover:fill-pl-pink"
            >
              <textPath xlinkHref="#curve">in what for wordle we live</textPath>
            </text>
          </svg>
          <img
            className="absolute top-2 h-auto w-1/2"
            src="/lvg.png"
            alt="Louis Van Gaal falling"
          />
        </Link>
        <Link
          to="/login"
          className="border-b-2 border-transparent hover:border-pl-pink hover:text-pl-pink"
        >
          Log In
        </Link>
      </nav>
    </header>
  );
}
