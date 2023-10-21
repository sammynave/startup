# Getting started

1. `npx degit sammynave/startup <directory_name>`
2. `pnpm i` (or npm or yarn or whatever)
3. start your docker container runtime then `docker-compose up` to build and start docker file (try out [colima](https://github.com/abiosoft/colima) if you're fed up with the macos docker app)
4. `pnpm dev` to start the server
5. visit http://localhost:5173/sign-up to make sure sign up is working
6. start building!

# Auth

Username and password authentication provided by [Lucia](https://lucia-auth.com/). Lucia also supports OAuth. Here's an example using [GitHub](https://lucia-auth.com/guidebook/github-oauth/sveltekit/) if you want to do that

# Database migrations

commands

- `pnpm db:generate`: reads `src/lib/server/db/schema.ts` and creates a new migration (`drizzle/<generated_name>.sql`) by calculating the diff of the current `schema.ts` and the previous
- `pnpm db:drop-migration`: prompts you for a migration to remove. do not manually remove migrations from the `drizzle` folder. always use the command.
- `pnpm db:push`: this is useful in development, do not use it in prod. this will push up all changes to the db. there is some interactivity here to manage existing tables and columns
- `pnpm db:migrate`: this runs the `migrate.js` script and applies all migrations that have not been run yet to the db. any time there is a change to the db, this is the command that is run to sync the migrations folder and the db structure.

See [Drizzle docs](https://orm.drizzle.team/kit-docs/commands) for more info on drizzle commands

new feature example flow:

1. update `schema.ts` with new table
2. `pnpm db:generate` to generate a new migration
3. `pnpm db:migrate` to sync the db schema with our schema definition

# create-svelte

Everything you need to build a Svelte project, powered by [`create-svelte`](https://github.com/sveltejs/kit/tree/master/packages/create-svelte).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```bash
# create a new project in the current directory
npm create svelte@latest

# create a new project in my-app
npm create svelte@latest my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://kit.svelte.dev/docs/adapters) for your target environment.
