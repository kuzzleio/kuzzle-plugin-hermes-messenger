import { Backend, KuzzleRequest } from "kuzzle";

import { HermesMessengerPlugin } from "../../index";

const app = new Backend("kuzzle");

const hermesMessengerPlugin = new HermesMessengerPlugin();

app.plugin.use(hermesMessengerPlugin);

app.hook.register("request:onError", async (request: KuzzleRequest) => {
  app.log.error(request.error);
});

app.config.set("plugins.kuzzle-plugin-logger.services.stdout.level", "debug");

hermesMessengerPlugin.getProvider('twilio').addAccount(
  "common",
  "AC-accountSid",
  "authToken",
  "+33629951621"
);
hermesMessengerPlugin.getProvider('sendgrid').addAccount(
  "common",
  "SG.apiKey",
  "amaret@kuzzle.io"
);
hermesMessengerPlugin.getProvider('smtp').addAccount(
  "common",
  "smtp.example.com",
  587,
  "dummyUser",
  "dummyPass",
  "amaret@kuzzle.io"
);
hermesMessengerPlugin.getProvider('smsenvoi').addAccount(
  "common",
  "commonUserKey",
  "commonAccessToken",
  "+33701020304"
);

app
  .start()
  .then(() => {
    app.log.info("Application started");
  })
  .catch(console.error); //eslint-disable-line no-console
