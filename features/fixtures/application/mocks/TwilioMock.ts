import sinon from 'sinon';

export class TwilioMock {
  // Stubbed methods
  messages = {
    create: sinon.stub(),
  };
}
