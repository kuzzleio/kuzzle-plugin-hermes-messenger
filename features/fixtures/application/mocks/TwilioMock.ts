import sinon from 'sinon';

export class TwilioMock {
  accountSid: string;
  authToken: string;

  // Stubbed methods
  messages = {
    create: sinon.stub(),
  };

  constructor (accountSid: string, authToken: string) {
    this.accountSid = accountSid;
    this.authToken = authToken;
  }
}
