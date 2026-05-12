// Helpers for working with the mocked pg Pool.
// Each test sets up an ordered list of responses; queries are matched by SQL substring.

import { queryMock } from "../mocks/pg";

export interface FakeQueryResult<T = any> {
  rows: T[];
  rowCount?: number;
}

export type QueryMatcher = (sql: string, params?: any[]) => boolean;

export interface QueryStub {
  match: string | RegExp | QueryMatcher;
  result: FakeQueryResult | Error;
}

let stubs: QueryStub[] = [];

const matches = (stub: QueryStub, sql: string, params: any[] | undefined) => {
  if (typeof stub.match === "function") return stub.match(sql, params);
  if (stub.match instanceof RegExp) return stub.match.test(sql);
  return sql.includes(stub.match);
};

export const setupQueryStubs = (next: QueryStub[]) => {
  stubs = [...next];
  queryMock.mockImplementation((sqlOrConfig: any, paramsArg?: any[]) => {
    const sql =
      typeof sqlOrConfig === "string"
        ? sqlOrConfig
        : sqlOrConfig && typeof sqlOrConfig === "object"
        ? sqlOrConfig.text
        : "";
    const params =
      paramsArg ??
      (typeof sqlOrConfig === "object" && sqlOrConfig
        ? sqlOrConfig.values
        : undefined);

    const idx = stubs.findIndex((s) => matches(s, sql, params));
    if (idx === -1) {
      return Promise.reject(
        new Error(`No mock query stub matched SQL: ${sql}`)
      );
    }
    const [stub] = stubs.splice(idx, 1);
    if (stub.result instanceof Error) return Promise.reject(stub.result);
    const result = {
      rowCount: stub.result.rows.length,
      ...stub.result,
    };
    return Promise.resolve(result);
  });
};

export const resetQueryStubs = () => {
  stubs = [];
  queryMock.mockReset();
};

export const remainingStubs = () => stubs.length;
