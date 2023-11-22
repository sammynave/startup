# TODO

- [x] websockets integration
- [ ] cursor based pagination
- [ ] responsive breakpoints
- [x] settings page (update username/password)
- [x] deploy scripts and config (render.com?)
- [ ] twilio
- [ ] sendgrid
- [ ] payment (stripe?)
- [ ] CLI/install script to choose which examples/config you want

# TOOD someday
- [ ] CRDT + offline first + absurdSQL
- [ ] liveblocks/partkit style collaboration
- [ ] https://electric-sql.com/docs/intro/local-first

# Getting started

1. `npx degit sammynave/startup <directory_name>`
2. `pnpm i` (or `npm` or `yarn` or whatever)
3. create a `.env` file base on `.env.example` and replace the values
4. start your docker container runtime then `docker-compose up` to build and start docker file (try out [colima](https://github.com/abiosoft/colima) if you're fed up with the macos docker app)
5. to execute `psql` in your docker container run: `docker exec -it startup-db-1 psql -U postgres`. NOTE: if you changed the values in `.env`, replace `-U postgres` in the previous command with with `-U <your postgres user>` and replace `startup-db-1` with `<directory_name>-db-1` from step 1.
6. once in `psql` run: `create database startup;` or whatever you want to call it. NOTE: make sure this matches the last segment of your `DATABASE_URL` value in `.env`
7. type `\q` to exit `psql`
8. `pnpm db:generate` to generate migrations from `src/lib/server/db/schema.ts`
9. `pnpm db:migrate` to apply the migrations to the database
10. `pnpm dev` to start the server
11. visit http://localhost:5173/sign-up to make sure sign up is working
12. start building!

# Auth

Username and password authentication provided by [Lucia](https://lucia-auth.com/). Lucia also supports OAuth. Here's an example using [GitHub](https://lucia-auth.com/guidebook/github-oauth/sveltekit/) if you want to do that

There are two roles available to a User: `user` and `admin`. Users can have one or both. The app is set up so any routes created under `/app/admin` will require the logged in user to have the role `admin`

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

# Deploying to Render.com

You can use the existing `render.yaml` to spin up a free web service and free database. Create your render account then in `Blueprints`, sync it with your repo.

You'll also need to create an `Env Group` to store the env `PUBLIC_FAKTORY_URL` since that's used in the app. If you don't need the worker, you can delete the example route `src/routes/app/example-background-job` and skip this step

See the [Render docs](https://render.com/docs/blueprint-spec) for more info

# Integrated websockets server(s)

This repo contains two examples (`/src/routes/app/websocket-example/using-pub-sub` and `/using-streams` -> `http://localhost:5173/app/websocket-example/using-pub-sub` and `/using-streams`) of how to setup websockets on the same port in the same process as the svelte server. (taken from this repo)[https://github.com/suhaildawood/SvelteKit-integrated-WebSocket].

Key files:

-  `prod-server.ts` - this is how you'll start your prod server (see `render.yaml`)
-  `vite.config.ts` - here we create a small plugin to insert the websocket servers (at `/websocket-streams` and `/websocket-pubsub`) paths for the dev and preview servers (`configureServer` and `configurePreviewServer`)
-  `src/lib/server/websockets/utils.ts` - this file contains the functions that create the server (`createWSSGlobalInstance`) and host it (`onHttpServerUpgrade`) referenced in the step above. This technique relies on attaching the websocket server to the global state. This file also has utility functions to help out when getting and setting the websocket server: `getStreamWss/getPubSubWss` and `setStreamsWss/setPubSubWss`
-  `src/hooks.server.ts` - this file initializes our websocket servers and adds a reference to it to `locals`. this way we can trigger events from other places in our Svelte server, for example, the default action in `src/routes/app/websocket-example/using-streams/+page.server.ts`. Here we're grabbing the server (`sWss`) off of the `event.locals` object and then triggering a reload for all of our connected clients.

Example files that make use of this setup:

`src/lib/server/websockets` - this directory contains examples of how one might implement a chat room example and a "presence" example (i.e. who else is here?).

- `handler.ts` - this file is responsible for setting up client connections. it handles session auth (via `Lucia`) and it set ups and coordinates the features we want to use over websockets (`Chat` and `Presence`)
- `chat.ts` and `presence.ts` are examples of how one might group together concerns into separate files/stay organized and still be able to share a single socket per client.
- The pub/sub version makes use of Redis' `pub/sub` feature so we can scale across multiple instances of this server. NOTE: Redis' Pub/Sub exhibits **at-most-once** message delivery semantics, meaning if a message is published and there are no subscribers connected, it will never be delivered.
- If your app requires stronger delivery guarantees look at the Redis Streams example. Messages in streams are persisted, and support both **at-most-once** as well as **at-least-once** delivery semantics.
- `redis-client.ts` - since you can't use the same Redis client for both publish and subscribe, this file just exports 3 different clients that can be reused throughout the app

`src/lib/websockets` - this directory contains all of the client side examples for implementing chat and "presence".

- `ws-store.ts` - this is a custom Svelte store that handles setting up the websocket and sending messages to the server
- `chat-store.ts` - this is a custom Svelte store (with an embedded `derived` store using `ws-store`) to add a listener to `ws-store` to handle receiving chat related messages. it also exports a `send` method for sending messages to the chat channel
- `presence-store.ts` - this is a `derived` store that adds a listener to `ws-store` for `type: 'presence'` messages.
- `reload-store.ts` - this was useful for debugging/developing these examples - it's also a `derived` store and used for flushing the Redis cache (i.e. deleting all chat messages) and force-reloading all connected clients.

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
