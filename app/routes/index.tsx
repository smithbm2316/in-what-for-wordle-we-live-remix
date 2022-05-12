import { Link } from "@remix-run/react";

import { useOptionalUser } from "~/utils";

export default function Index() {
  const user = useOptionalUser();

  return (
    <main className="m-4 mx-auto max-w-max rounded-b-md p-8">
      <h1 className="text-5xl font-extrabold text-pl-pink">
        In What For Wordle We Live
      </h1>
      <p className="my-8 text-pl-darkPurple">
        <span className="block font-medium">Premier League Wordle.</span>
        For the Premier League sickos, you know who you are.
      </p>
      {user ? (
        <Link to="/play" className="btn btn-green">
          Get playing now!
        </Link>
      ) : (
        <form className="space-y-6">
          <div>
            <label htmlFor="email" className="sr-only text-sm">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="text"
              autoComplete="email"
              placeholder="Email address"
            />
          </div>
          <div>
            <label htmlFor="password" className="sr-only text-sm">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="Password"
            />
          </div>
          <button type="submit" className="btn btn-pink">
            Sign up for a free account now!
          </button>
        </form>
      )}
    </main>
  );
}
