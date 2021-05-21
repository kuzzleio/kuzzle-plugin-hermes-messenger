import { Backend, KuzzleRequest } from 'kuzzle';
import should from 'should';
import sinon from 'sinon';

import { HermesMessengerPlugin } from '../../../index';

export function registerTestController (app: Backend, plugin: HermesMessengerPlugin) {
  app.controller.register('tests', {
    actions: {
      verifySendTwilio: {
        handler: async (request: KuzzleRequest) => {
          const { from, to, text } = request.getBody();
          const account = request.getString('account', 'common');

          const client = plugin.clients.get('twilio')['accounts'].get(account);

          should(client.messages.create.getCall(0).args)
            .be.eql([{ from, to, body: text }]);

          sinon.restore();
        }
      },
      verifySendSendgrid: {
        handler: async (request: KuzzleRequest) => {
          const { from, to, subject, html } = request.getBody();
          const account = request.getString('account', 'common');

          const client = plugin.clients.get('sendgrid')['accounts'].get(account);

          should(client.send.getCall(0).args)
            .be.eql([{ from, to, subject, html }]);

          sinon.restore();
        }
      }
    }
  });
}
