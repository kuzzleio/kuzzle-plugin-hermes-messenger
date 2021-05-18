import should from 'should';
import 'sinon';
import 'should-sinon';
import { Backend, KuzzleRequest } from 'kuzzle';

import { TwilioMock, SendgridMock } from './mocks';
import { TwilioClient, SendgridClient } from '../../../lib/messenger-clients';

TwilioClient.prototype['getClientCtor'] = () => TwilioMock as any;
SendgridClient.prototype['getClientCtor'] = () => SendgridMock as any;

import { HermesMessengerPlugin } from '../../../index';

const app = new Backend('kuzzle');

const hermesMessengerPlugin = new HermesMessengerPlugin();

hermesMessengerPlugin.clients.get('twilio').initCommonClient('accountSid', 'authToken');
hermesMessengerPlugin.clients.get('sendgrid').initCommonClient('apiKey');

app.controller.register('twilio-tests', {
  actions: {
    verifySendSms: {
      handler: async (request: KuzzleRequest) => {
        const { from, to, text } = request.getBody();
        const account = request.getString('account', 'COMMON');

        let client;
        if (account === 'COMMON') {
          client = hermesMessengerPlugin.clients.get('twilio').commonClient;
        }
        else {
          client = hermesMessengerPlugin.clients.get('twilio')['privateClients'].get(account);
        }

        should(client.messages.send.getCall(0).args).be.eql([{ from, to, body: text }])
      }
    }
  }
})

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
