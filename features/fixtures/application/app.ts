import { Backend, KuzzleRequest } from 'kuzzle';

import { TwilioMock, SendgridMock } from './mocks';
import { TwilioClient, SendgridClient } from '../../../lib/messenger-clients';

import { HermesMessengerPlugin } from '../../../index';
import { registerTestController } from './TestController';

// Mock
if (! process.env.DO_NOT_MOCK) {
  TwilioClient.prototype['_createAccount'] = () => new TwilioMock() as any;
  SendgridClient.prototype['_createAccount'] = () => new SendgridMock() as any;
}

const app = new Backend('kuzzle');

const hermesMessengerPlugin = new HermesMessengerPlugin();

registerTestController(app, hermesMessengerPlugin);

app.plugin.use(hermesMessengerPlugin);

app.hook.register('request:onError', async (request: KuzzleRequest) => {
  app.log.error(request.error);
});

app.config.set('plugins.kuzzle-plugin-logger.services.stdout.level', 'debug');

app.start()
  .then(() => {
    hermesMessengerPlugin.clients.twilio.addAccount('common', 'accountSid', 'authToken');
    hermesMessengerPlugin.clients.sendgrid.addAccount('common', 'apiKey');

    app.log.info('Application started');
  })
  .catch(console.error);
