import { Backend, KuzzleRequest } from "kuzzle";

import { HermesMessengerPlugin } from "../../index";

const app = new Backend("kuzzle");

const hermesMessengerPlugin = new HermesMessengerPlugin();

app.plugin.use(hermesMessengerPlugin);

app.hook.register("request:onError", async (request: KuzzleRequest) => {
  app.log.error(request.error);
});

app.config.set("plugins.kuzzle-plugin-logger.services.stdout.level", "debug");

hermesMessengerPlugin.clients.twilio.addAccount(
  "common",
  "AC-accountSid",
  "authToken",
  "+33629951621"
);
hermesMessengerPlugin.clients.sendgrid.addAccount(
  "common",
  "SG.apiKey",
  "amaret@kuzzle.io"
);

app
  .start()
  .then(() => {
    app.log.info("Application started");
  })
  .catch(console.error); //eslint-disable-line no-console
