import { Backend, KuzzleRequest } from 'kuzzle';

import { HermesMessengerPlugin } from '../../../index';

const app = new Backend('kuzzle');

const hermesMessengerPlugin = new HermesMessengerPlugin();

hermesMessengerPlugin.clients.get('twilio').initCommonClient('accountSid', 'authToken');
hermesMessengerPlugin.clients.get('sendgrid').initCommonClient('apiKey');

app.plugin.use(hermesMessengerPlugin);

app.hook.register('request:onError', async (request: KuzzleRequest) => {
  app.log.error(request.error);
});

app.config.set('plugins.kuzzle-plugin-logger.services.stdout.level', 'debug');

app.start()
  .then(() => {
    app.log.info('Application started');
  })
  .catch(console.error);
