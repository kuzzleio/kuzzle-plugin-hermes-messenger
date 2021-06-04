import sinon from 'sinon';

export class SendgridMock {
  // Stubbed methods
  setApiKey = sinon.stub();
  send = sinon.stub();
}
