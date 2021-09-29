import { Backend, KuzzleRequest } from 'kuzzle';

import { TwilioMock, SendgridMock } from './mocks';
import { TwilioClient, SendgridClient } from '../../../lib/messenger-clients';

import { HermesMessengerPlugin } from '../../../index';
import { registerTestController } from './TestController';

// Mock
if (! process.env.DO_NOT_MOCK) {
  TwilioClient.prototype['_createAccount'] = (accountSid: string, authToken: string, defaultSender: string) => ({
    client: new TwilioMock() as any,
    options: {
      defaultSender
    }
  });

  SendgridClient.prototype['_createAccount'] = (apiKey: string, defaultSender: string) => ({
    client: new SendgridMock() as any,
    options: {
      defaultSender
    }
  });
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
    hermesMessengerPlugin.clients.twilio.addAccount('common', 'accountSid', 'authToken', '+33629951621');
    hermesMessengerPlugin.clients.sendgrid.addAccount('common', 'apiKey', 'amaret@kuzzle.io');

    app.log.info('Application started');
  })
  .catch(console.error);
