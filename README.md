# TODO

- [ ] responsive breakpoints
- [x] settings page (update username/password)
- [ ] deploy scripts and config (render.com?)
- [ ] twilio
- [ ] sendgrid
- [ ] payment (stripe?)

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

# UI components via shadcn-svelte

shadcn-svelte components can be added to the project (and updated) via the CLI - example: `pnpx shadcn-svelte@latest add Card`

They will be added to the `src/lib/components/ui` directory

see [CLI commands](https://www.shadcn-svelte.com/docs/cli) for more info

shadcn-svelte uses [tailwindcss](https://tailwindcss.com/) for [theming](https://www.shadcn-svelte.com/docs/theming). The default theme values are in `src/app.postcss`

# Background workers via Faktory

Running `docker-compose up` will start a [Faktory](https://contribsys.com/faktory/) job server

The Faktory dashboard can be found here: http://localhost:7420

Jobs (a.k.a producers) can be added in `src/lib/server/jobs`

Workers (a.k.a consumers) can be added in `src/lib/server/workers`.

You can kick off an example job with the `send job` button in the `/app` route

## Using Faktory locally

This is kind of a budget background job set up for dev but it works 🤷‍♂️

- 1. Make sure you `docker-compose up`ed
- 2. Open new terminal and run `pnpm dev:worker`. you can pass optionally pas `--workers 2` (or any number) to have more than one worker going

NOTE: if you pass `--workers <num>` the apps will spin up starting on port `5174` and increment for each worker. so `--workers 3` will have 3 processes: `http://localhost:5174`, `http://localhost:5175`, and `http://localhost:5176`

Running `pnpm dev:worker` will spin up an instance of the sveltekit app in "worker mode" (i.e. `WORKER=true` env var is set), then it will make a `curl` request to manually trigger the code in `hooks.server.ts` to load the worker file. Once the worker file is loaded, it registers itself with the Faktory server and starts pulling jobs off of the queue. The `curl` request is necessary in local dev because the code in `hooks.server.ts` isn't loaded until a request to the app as made. As far as I know, there is no `afterInit` or `afterAppBoot` or any way to hook into the boot up process in dev. This shouldn't be a problem when the app is built for production, as long as you build the worker with `pnpm build:worker`.

This is good in the sense that we can write our worker code side-by-side with our app code, share the build process, and share all of the same classes, functions, etc... (like Sidekiq and Rails) but kind of annoying to have had to create and maintain `dev-worker.js`.

IMPORTANT: when you're working on `worker` code, you'll notice that `hmr` doesn't work. You'll need to stop and re-`pnpm dev:worker` every time you change code and want to try it out. I'm not sure how to get around this since the Faktory workers are singletons and can only be registered once. Maybe `vite` has a way to run arbitrary code on reload and the Faktory node client has a way to remove jobs from the [registry](https://github.com/jbielick/faktory_worker_node/blob/main/docs/api.md#Registry) then re-add them.

Or maybe it's better to define the workers outside of the SvelteKit app and run them directly (e.g. `node ./workers/worker.js`). The problem there is we lose the ability to import functions from the app. We'll have to write some config to deal with that and it seems like a pain. I'll look into it someday.

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
pnpm dev
```

## Building

To create a production version of your app:

```bash
pnpm build
```

You can preview the production build with `npm preview`.

> To deploy your app, you may need to install an [adapter](https://kit.svelte.dev/docs/adapters) for your target environment.
