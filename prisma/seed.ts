import { PrismaClient } from "@prisma/client";
import plData from "../public/plData.json";

const prisma = new PrismaClient();

async function seed() {
  for (const pos of plData.positions) {
    await prisma.position.create({
      data: {
        position: pos,
      },
    });
  }

  for (const team of plData.teams) {
    await prisma.team.create({
      data: team,
    });
  }

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
