import { Backend, KuzzleRequest } from "kuzzle";

import { HermesMessengerPlugin, SMTPClientSSLMode } from "../../index";

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

hermesMessengerPlugin.clients.smtp.addAccount(
  "common",
  "smtp.example.com",
  587,
  "dummyUser",
  "dummyPass",
  "amaret@kuzzle.io",
  SMTPClientSSLMode.NONE
);

hermesMessengerPlugin.clients.smtp.addAccount(
  "starttls",
  "smtp.example.com",
  587,
  "dummyUser",
  "dummyPass",
  "amaret@kuzzle.io",
  SMTPClientSSLMode.STARTTLS
);

hermesMessengerPlugin.clients.smtp.addAccount(
  "tls",
  "smtp.example.com",
  465,
  "dummyUser",
  "dummyPass",
  "amaret@kuzzle.io",
  SMTPClientSSLMode.TLS
);


app
  .start()
  .then(() => {
    app.log.info("Application started");
  })
  .catch(console.error); //eslint-disable-line no-console
