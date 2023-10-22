# Getting started

1. `npx degit sammynave/startup <directory_name>`
2. `pnpm i` (or `npm` or `yarn` or whatever)
3. create a `.env` file base on `.env.example` and replace the values
4. start your docker container runtime then `docker-compose up` to build and start docker file (try out [colima](https://github.com/abiosoft/colima) if you're fed up with the macos docker app)
5. to execute `psql` in your docker container run: `docker exec -it startup-db-1 psql -U postgres`. NOTE: if you changed the values in `.env`, replace `-U postgres` in the previous command with with `-U <POSTGRES_USER>` and replace `startup-db-1` with `<directory_name>-db-1` from step 1.
6. once in `psql` run: `create database startup;` or whatever you want to call it. NOTE: make sure this matches the last segment of your `DATABASE_URL` value in `.env`
7. type `\q` to exit `psql`
8. `pnpm db:generate` to generate migrations from `src/lib/server/db/schema.ts`
9. `pnpm db:migrate` to apply the migrations to the database
10. `pnpm dev` to start the server
11. visit http://localhost:5173/sign-up to make sure sign up is working
12. start building!

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

# Background workers via Bull

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
