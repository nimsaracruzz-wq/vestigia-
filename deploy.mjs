// Coolify starts applications from the repository root. The production
// launcher and its Prisma dependencies live in backend/, so switch there
// before loading the existing deployment entrypoint.
import process from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
process.chdir(path.join(root, 'backend'));
await import('./backend/deploy.mjs');
