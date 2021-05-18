import sinon from 'sinon';

export class SendgridMock {
  // Stubbed methods
  send = sinon.stub();
  setApiKey = sinon.stub();
}
