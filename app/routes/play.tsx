import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useLoaderData, useSubmit } from "@remix-run/react";
import { prisma } from "~/db.server";
import { Fragment, useEffect, useRef, useState } from "react";
import { Combobox, Transition } from "@headlessui/react";

import { requireUserId, requireUser } from "~/session.server";

async function getPlayerNames() {
  return await prisma.player.findMany({
    select: {
      id: true,
      name: true,
      imgUrl: true,
    },
  });
}

async function getGameData(userId: string, last24Hours: Date) {
  const currentGame = await prisma.game.findFirst({
    where: {
      User: {
        id: userId,
      },
      date: {
        gt: last24Hours,
      },
    },
    include: {
      guesses: {
        include: {
          positions: true,
          teams: true,
        },
      },
    },
  });

  return currentGame;
}
type PlayerNames = Awaited<ReturnType<typeof getPlayerNames>>;
type PlayerName = PlayerNames[0];
type LoaderGameData = Awaited<ReturnType<typeof getGameData>>;
type LoaderData = { playerNames: PlayerNames; gameData: LoaderGameData };

async function updateCurrentGame(
  userId: string,
  playerId: number,
  today: Date
) {
  const currentGame = await prisma.game.findFirst({
    where: {
      User: {
        id: userId,
      },
      date: {
        gte: today,
      },
    },
  });

  const updatedGame = await prisma.game.upsert({
    where: {
      id: currentGame?.id || "",
    },
    update: {
      guesses: {
        connect: {
          id: playerId,
        },
      },
    },
    create: {
      guesses: {
        connect: {
          id: playerId,
        },
      },
    },
  });

  // update the user with the new game
  await prisma.user.update({
    data: {
      games: {
        connect: {
          id: updatedGame.id,
        },
      },
    },
    where: {
      id: userId,
    },
  });
}

export let loader: LoaderFunction = async ({ request }) => {
  // ensure we actually are logged in
  const userId = await requireUserId(request);

  const playerNames = await getPlayerNames();
  const last24Hours = new Date(new Date().valueOf() - 24 * 60 * 60);
  const gameData = await getGameData(userId, last24Hours);

  return json({ playerNames, gameData });
};

export let action: ActionFunction = async ({ request }) => {
  const form = await request.formData();
  const form_guessId = form.get("guess[id]");
  const form_today = form.get("today");
  if (typeof form_guessId !== "string" || typeof form_today !== "string") {
    return json({ gameData: null });
  }

  const guessId = parseInt(form_guessId, 10);
  const today = parseInt(form_today, 10);
  if (isNaN(guessId) || isNaN(today)) {
    return json({ gameData: null });
  }

  const user = await requireUser(request);
  await updateCurrentGame(user.id, guessId, new Date(today));
  return json({ status: 200 });
};

const defaultSelectedPlayer = {
  id: -1,
  name: "",
  imgUrl: "",
};

function ViewData({ gameData }: { gameData: LoaderGameData }) {
  return (
    <>
      {gameData?.guesses && (
        <section id="guesses" className="mt-8">
          <div className="grid grid-cols-6 items-center gap-4 border-b border-b-pl-lightGray desc:p-4">
            <p>Player</p>
            <p>Team</p>
            <p>Position</p>
            <p>Age</p>
            <p>Number</p>
            <p>Height</p>
          </div>
          {gameData.guesses.map((player) => {
            if (!player) {
              return null;
            }

            const currentTeam = player.teams.find(
              (team) => player.currentTeam === team.name
            ) || { name: player.currentTeam, imgUrl: "" };
            const ageInMs =
              new Date().valueOf() - new Date(player.dob).valueOf();
            const age = Math.floor(ageInMs / 365 / 24 / 60 / 60 / 1000);
            const inches = Math.floor(player.height * 0.3937008);
            const height = `${Math.floor(inches / 12)}'${inches % 12}"`;

            return (
              <div
                key={player.id}
                className="grid grid-cols-6 items-center gap-4 border-b border-b-pl-lightGray desc:p-4"
              >
                <p>{player.name}</p>
                <div className="flex items-center gap-2">
                  <img
                    className="h-auto w-6"
                    src={currentTeam?.imgUrl}
                    alt={currentTeam.name}
                  />
                  <p>{currentTeam.name.replace(/[a-z\s]/g, "")}</p>
                </div>
                <p>{player.positions[0].position}</p>
                <p>{age}</p>
                <p>{`#${player.jerseyNumber}`}</p>
                <p>{height}</p>
              </div>
            );
          })}
        </section>
      )}
    </>
  );
}

export default function Play() {
  const today = new Date().setHours(0, 0, 0, 0).valueOf();
  const { playerNames, gameData } = useLoaderData<LoaderData>();
  // make sure the last gameData record happened today in the user's local timezone
  const gameHappenedToday =
    gameData?.date && new Date(gameData.date).valueOf() > today;
  const formRef = useRef<HTMLFormElement>(null);
  const formInputRef = useRef<HTMLInputElement>(null);
  const submit = useSubmit();
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerName>(
    defaultSelectedPlayer
  );
  const [guess, setGuess] = useState<string>("");

  // Update the player names that our user gets to see as they type
  const filteredPlayerNames = playerNames.filter((player) =>
    player.name.toLowerCase().includes(guess.toLowerCase())
  );

  // Submit the form when the user presses "Enter" on the Combobox, *AFTER* our state has updated to
  // reflect the selected player
  useEffect(() => {
    if (selectedPlayer.id !== -1) {
      const formData = new FormData(formRef.current || undefined);
      submit(formData, {
        method: "post",
        action: "/play",
      });
      formRef.current?.reset();
    }
  }, [selectedPlayer, submit]);

  return (
    <main className="mx-auto my-8 flex w-11/12 max-w-screen-lg flex-col items-center">
      <h1 className="mb-3 uppercase">in what for wordle we live</h1>
      <h2 className="mb-6 uppercase">Premier League guessing game</h2>
      <Form
        ref={formRef}
        method="post"
        className="flex flex-wrap gap-4"
        reloadDocument
      >
        <input
          type="hidden"
          name="today"
          value={new Date().setHours(0, 0, 0, 0).valueOf()}
        />
        <Combobox
          as="div"
          value={selectedPlayer}
          onChange={(player) => {
            /* const formData = new FormData(formRef.current || undefined);
            formData.set("guess[id]", player.id.toString());
            formData.set("guess[name]", player.name.toString());
            formData.set("guess[imgUrl]", player.imgUrl.toString());

            submit(formData, {
              method: "post",
              action: "/play",
            }); */
            setSelectedPlayer(player);
            setGuess("");
          }}
          name="guess"
          className="relative w-96 text-xl"
        >
          <Combobox.Label className="sr-only">Current guess</Combobox.Label>
          <Combobox.Input
            ref={formInputRef}
            onChange={(event) => setGuess(event.target.value)}
            displayValue={(player: PlayerName) => player.name}
            placeholder="Enter your next guess..."
            className="p-4"
            type="submit"
            autoFocus
          />
          <Transition
            show={guess.length > 1}
            enter="transition duration-100 ease-out"
            enterFrom="transform scale-95 opacity-0"
            enterTo="transform scale-100 opacity-100"
            leave="transition duration-75 ease-out"
            leaveFrom="transform scale-100 opacity-100"
            leaveTo="transform scale-95 opacity-0"
          >
            <Combobox.Options className="absolute top-2 left-0 right-0 max-h-48 overflow-y-auto rounded-md bg-white p-4 shadow-md">
              {filteredPlayerNames.length === 0 ? (
                <p>No matching results found.</p>
              ) : (
                <>
                  {guess.length > 1 &&
                    filteredPlayerNames.map((player) => (
                      <Combobox.Option
                        key={player.id}
                        value={player}
                        as={Fragment}
                      >
                        {({ active }) => (
                          <li
                            className={`${
                              active ? "bg-gray-100" : "inherit"
                            } cursor-pointer rounded-md p-2`}
                          >
                            {player.name}
                          </li>
                        )}
                      </Combobox.Option>
                    ))}
                </>
              )}
            </Combobox.Options>
          </Transition>
        </Combobox>
        <button type="submit" className="btn btn-green">
          Submit guess
        </button>
      </Form>
      <ViewData gameData={gameHappenedToday ? gameData : null} />
    </main>
  );
}
