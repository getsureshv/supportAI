import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Starter DCL team list. Edit freely; the app reads teams from the DB, not from here.
const TEAMS: Array<{ name: string; division?: string }> = [
  { name: 'Dallas Warriors', division: 'Division A' },
  { name: 'Dallas Strikers', division: 'Division A' },
  { name: 'Texas Tigers', division: 'Division A' },
  { name: 'Plano Cricket Club', division: 'Division A' },
  { name: 'Irving Royals', division: 'Division A' },
  { name: 'Frisco Falcons', division: 'Division B' },
  { name: 'Richardson Lions', division: 'Division B' },
  { name: 'Arlington Eagles', division: 'Division B' },
  { name: 'Fort Worth Knights', division: 'Division B' },
  { name: 'Garland Gladiators', division: 'Division B' },
  { name: 'McKinney Mavericks', division: 'Division C' },
  { name: 'Lewisville Legends', division: 'Division C' },
  { name: 'Carrollton Chargers', division: 'Division C' },
  { name: 'Mesquite Maestros', division: 'Division C' },
  { name: 'Denton Dragons', division: 'Division C' },
  { name: 'North Dallas Ninjas', division: 'Division D' },
  { name: 'Coppell Comets', division: 'Division D' },
  { name: 'Addison Aces', division: 'Division D' },
  { name: 'Rowlett Raiders', division: 'Division D' },
  { name: 'Allen Avengers', division: 'Division D' },
];

async function main() {
  console.log('Seeding teams…');
  for (const t of TEAMS) {
    await prisma.team.upsert({
      where: { name: t.name },
      update: { division: t.division },
      create: t,
    });
  }
  const count = await prisma.team.count();
  console.log(`✓ ${count} teams in DB.`);
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
