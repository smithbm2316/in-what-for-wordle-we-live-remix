import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useCatch, useLoaderData, useSubmit } from "@remix-run/react";
import { prisma } from "~/db.server";
import { Fragment, useEffect, useRef, useState } from "react";
import { Combobox, Transition } from "@headlessui/react";

import { requireUserId, requireUser } from "~/session.server";
import { dateGenerator } from "~/utils";

async function getPlayerOfTheDay() {
  const today = dateGenerator('today');
  const todaysPlayer = await prisma.playerOfTheDay.findFirst({
    where: {
      date: {
        gt: today,
      }
    }
  });
  if (todaysPlayer) {
    return todaysPlayer;
  }

  const randomPlayerId = Math.floor(Math.random() * 500);

  return await prisma.playerOfTheDay.create({
    data: {
      player: {
        connect: {
          id: randomPlayerId,
        },
      },
      date: today,
    },
  })
}

async function getPlayers() {
  return await prisma.player.findMany({
    select: {
      id: true,
      name: true,
      imgUrl: true,
    },
  });
}

async function getGameData(userId: string) {
  const currentGame = await prisma.game.findFirst({
    where: {
      User: {
        id: userId,
      },
      date: {
        gt: dateGenerator('last24'),
      },
    },
    include: {
      guesses: {
        include: {
          player: {
            include: {
              positions: true,
              teams: true,
            },
          }
        },
        orderBy: {
          number: 'desc',
        },
      },
    },
  });

  return currentGame;
}
type PlayerNames = Awaited<ReturnType<typeof getPlayers>>;
type PlayerName = PlayerNames[0];
type LoaderGameData = Awaited<ReturnType<typeof getGameData>>;
type LoaderData = { playerNames: PlayerNames; gameData: LoaderGameData };

async function updateCurrentGame(
  userId: string,
  playerId: number,
  today: Date
) {
  // See if we can find a currently active game
  const currentGame = await prisma.game.findFirst({
    where: {
      User: {
        id: userId,
      },
      date: {
        gte: today,
      },
    },
    include: {
      guesses: {
        select: {
          id: true,
          number: true,
        },
        orderBy: {
          number: 'desc',
        }
      },
    }
  });

  // get the most recent guess's number
  const mostRecentGuess = currentGame?.guesses && currentGame.guesses.length > 0 ? currentGame.guesses[0] : null;

  let updatedGame;
  if (currentGame && mostRecentGuess) {
    // Make sure that the user isn't out of guesses
    if (mostRecentGuess.number >= 8) {
      throw json(null, { status: 400, statusText: 'You are out of guesses!' });
    }

    // Update the game with a new guess
    updatedGame = await prisma.game.update({
      where: {
        id: currentGame.id,
      },
      data: {
        guesses: {
          create: {
            number: mostRecentGuess.number + 1,
            player: {
              connect: {
                id: playerId,
              }
            }
          },
        },
      },
    });
  } else {
    // Create a new game and a new guess
    updatedGame = await prisma.game.create({
      data: {
        guesses: {
          create: {
            player: {
              connect: {
                id: playerId,
              }
            },
            number: 1,
          },
        }
      },
    })
  }

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

  // Get the player data
  const players = await getPlayers();
  // And the current game session's data
  const gameData = await getGameData(userId);

  return json({ playerNames: players, gameData });
};

export let action: ActionFunction = async ({ request }) => {
  // Get the relevant form data
  const formData = await request.formData();
  const guess = {
    id: formData.get("guess[id]"),
    name: formData.get("guess[name]"),
    today: formData.get("today"),
  };

  // Verify that the guess[id] and guess[name] properties are valid
  if (typeof guess.id !== 'string' || parseInt(guess.id) <= -1) {
    // If we don't have a valid id, let's try to fetch the player by name, assuming that the
    // autocompletion on the page may not have been working properly (maybe a slow connection or
    // javascript disabled)
    const players = await getPlayers();
    const guessName = typeof guess.name === 'string' && guess.name.length > 0 ? guess.name.toLowerCase() : null;
    const validPlayer = guessName && players.find(player => player.name.toLowerCase() === guessName);
    if (!validPlayer) {
      throw json(null, { status: 404, statusText: 'Invalid player guessed' });
    }
    guess.id = validPlayer.id.toString();
  }

  // Get the proper values now that they've been validated
  const guessId = parseInt(guess.id, 10);
  const today = typeof guess.today === 'string' ? parseInt(guess.today, 10) : dateGenerator('today').valueOf();
  // Make sure we didn't have a weird not-a-number issue when parsing the numbers
  if (isNaN(guessId) || isNaN(today)) {
    throw json(null, { status: 500, statusText: 'A server error occurred, please refresh the page' });
  }

  // Get the user and update them with the current guess that the user submitted
  const user = await requireUser(request);
  await updateCurrentGame(user.id, guessId, new Date(today));
  return json(null, { status: 200 })
};

const defaultSelectedPlayer = {
  id: -1,
  name: "",
  imgUrl: "",
};

function Guesses({ gameData }: { gameData: LoaderGameData }) {
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
          {gameData.guesses.map((guess) => {
            if (!guess) {
              return null;
            }
            const { player } = guess;

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
                    className="w-6 h-6 text-transparent"
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

export default function PlayGame() {
  const today = dateGenerator('today').valueOf();
  const { playerNames, gameData } = useLoaderData<LoaderData>();
  const actionError = useCatch();
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
      {!actionError || actionError.status !== 200 ? (
        <>
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
                                className={`${active ? "bg-gray-100" : "inherit"
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
          <Guesses gameData={gameHappenedToday ? gameData : null} />
        </>
      ) : (
        <div>{actionError.statusText}</div>
      )}
    </main>
  );
}
