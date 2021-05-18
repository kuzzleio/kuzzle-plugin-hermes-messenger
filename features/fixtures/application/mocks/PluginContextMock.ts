import sinon from 'sinon';

export class PluginContextMock {
  accessors = {
    sdk: {

    }
  };

  log = {
    debug: sinon.stub()
  };

}