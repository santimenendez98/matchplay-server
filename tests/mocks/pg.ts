// Mock for the `pg` module. Returns a fake Pool whose `query` method is a jest.fn().
// Tests can call setMockQueryImpl(...) to configure responses.

export const queryMock = jest.fn();

const connectMock = jest.fn().mockResolvedValue({
  release: jest.fn(),
  query: queryMock,
});

class FakePool {
  query = queryMock;
  connect = connectMock;
  on = jest.fn();
  end = jest.fn().mockResolvedValue(undefined);
}

export const Pool = FakePool;

export const resetPgMocks = () => {
  queryMock.mockReset();
  connectMock.mockClear();
};

export default { Pool: FakePool };
