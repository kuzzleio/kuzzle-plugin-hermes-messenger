import { Backend, KuzzleRequest } from 'kuzzle';
import should from 'should';
import sinon from 'sinon';

import { HermesMessengerPlugin } from '../../../index';
import { SendgridMock, TwilioMock } from './mocks';

export function registerTestController (app: Backend, plugin: HermesMessengerPlugin) {
  app.controller.register('tests', {
    actions: {
      verifySendTwilio: {
        handler: async (request: KuzzleRequest) => {
          sinon.restore();
          const { from, to, text } = request.getBody();
          const account = request.getString('account', 'common');

          const client = plugin.clients.twilio['accounts'].get(account) as TwilioMock;

          try {
            should(client.messages.create.getCall(0).args)
            .be.eql([{ from, to, body: text }]);
          }
          finally {
            sinon.restore();
          }
        }
      },
      verifySendSendgrid: {
        handler: async (request: KuzzleRequest) => {
          sinon.restore();
          const body = request.getBody();
          const account = request.getString('account', 'common');

          const client = plugin.clients.sendgrid['accounts'].get(account) as SendgridMock;

          try {
            should(client.sendMultiple.getCall(0).args)
            .be.eql([body]);
          }
          finally {
            sinon.restore();
          }
        }
      }
    }
  });
}
