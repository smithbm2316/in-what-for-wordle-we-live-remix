import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import plData from "../public/plData.json";

const prisma = new PrismaClient();

async function seed() {
  // Create all the Position entries from our scraped data
  for (const pos of plData.positions) {
    await prisma.position.create({
      data: {
        position: pos,
      },
    });
  }

  // Create all of the Team entries from our scraped data
  for (const team of plData.teams) {
    await prisma.team.create({
      data: team,
    });
  }

  // Create all the Player entries from our scraped data, connecting the models to the proper
  // Position and Team entries already existing in the database
  for (const player of plData.players) {
    const { positions, teams, ...playerData } = player;

    await prisma.player.create({
      data: {
        ...playerData,
        positions: {
          connect: positions.map((position) => ({
            position,
          })),
        },
        teams: {
          connect: teams.map((team) => ({
            name: team.name,
          })),
        },
      },
    });
  }

  // Query for attackers between the ages of 24 and 28
  const playersForGames = await prisma.player.findMany({
    select: {
      id: true,
    },
    where: {
      age: {
        gte: 24,
        lte: 28,
      },
      positions: {
        every: {
          position: {
            in: ["ST", "LF", "RF", "CF", "LW", "RW"],
          },
        },
      },
    },
  }); // Should return ~24 players

  // Create a test user for me to login with and have some pre-existing Games played
  const userEmail = "ben@remix.run";
  const hashedPassword = await bcrypt.hash("benisbuildingbetterwebsites", 10);
  await prisma.user.create({
    data: {
      email: userEmail,
      password: {
        create: {
          hash: hashedPassword,
        },
      },
      games: {
        create: [
          {
            guesses: {
              connect: playersForGames.slice(0, 6),
            },
          },
          {
            guesses: {
              connect: playersForGames.slice(7, 11),
            },
          },
        ],
      },
    },
  });

  console.log(`Database has been seeded. 🌱`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
