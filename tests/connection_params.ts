const { test } = Deno;
import { is, assert, assertEquals, assertThrows } from "../test_deps.ts";
import { createParams, parseOptionsFromDsn } from "../connection_params.ts";

function withEnv(obj: Record<string, string>, fn: () => void) {
  return () => {
    const getEnv = Deno.env.get;

    Deno.env.get = (key: string) => {
      return obj[key] || getEnv(key);
    };

    try {
      fn();
    } finally {
      Deno.env.get = getEnv;
    }
  };
}

function withNotAllowedEnv(fn: () => void) {
  return () => {
    const getEnv = Deno.env.get;

    Deno.env.get = (_key: string) => {
      throw new Deno.errors.PermissionDenied("");
    };

    try {
      fn();
    } finally {
      Deno.env.get = getEnv;
    }
  };
}

test("dsnStyleParameters", function () {
  const p = parseOptionsFromDsn(
    "postgres://some_user@some_host:10101/deno_postgres",
  );

  assertEquals(p.database, "deno_postgres");
  assertEquals(p.user, "some_user");
  assertEquals(p.hostname, "some_host");
  assertEquals(p.port, 10101);
});

test("dsnStyleParametersWithoutExplicitPort", function () {
  const p = parseOptionsFromDsn(
    "postgres://some_user@some_host/deno_postgres",
  );

  assertEquals(p.database, "deno_postgres");
  assertEquals(p.user, "some_user");
  assertEquals(p.hostname, "some_host");
  assertEquals(p.port, undefined);
});

test("dsnStyleParametersWithApplicationName", function () {
  const p = parseOptionsFromDsn(
    "postgres://some_user@some_host:10101/deno_postgres?application_name=test_app",
  );

  assertEquals(p.database, "deno_postgres");
  assertEquals(p.user, "some_user");
  assertEquals(p.hostname, "some_host");
  assertEquals(p.applicationName, "test_app");
  assertEquals(p.port, 10101);
});

test("dsnStyleParametersWithInvalidDriver", function () {
  assertThrows(
    () =>
      parseOptionsFromDsn(
        "somedriver://some_user@some_host:10101/deno_postgres",
      ),
    undefined,
    "Supplied DSN has invalid driver: somedriver.",
  );
});

test("dsnStyleParametersWithInvalidPort", function () {
  assertThrows(
    () =>
      parseOptionsFromDsn(
        "postgres://some_user@some_host:abc/deno_postgres",
      ),
    undefined,
    "Invalid URL",
  );
});

test("objectStyleParameters", function () {
  const p = createParams({
    user: "some_user",
    hostname: "some_host",
    port: 10101,
    database: "deno_postgres",
  });

  assertEquals(p.database, "deno_postgres");
  assertEquals(p.user, "some_user");
  assert(is.function_(p.conn));
});

test(
  "envParameters",
  withEnv({
    PGUSER: "some_user",
    PGHOST: "some_host",
    PGPORT: "10101",
    PGDATABASE: "deno_postgres",
  }, function () {
    const p = createParams();
    assertEquals(p.database, "deno_postgres");
    assertEquals(p.user, "some_user");
    assert(is.function_(p.conn));
  }),
);

test(
  "envParametersWithInvalidPort",
  withEnv({
    PGUSER: "some_user",
    PGHOST: "some_host",
    PGPORT: "abc",
    PGDATABASE: "deno_postgres",
  }, function () {
    const error = assertThrows(
      () => createParams(),
      undefined,
      "Invalid port NaN",
    );
    assertEquals(error.name, "ConnectionParamsError");
  }),
);

test(
  "envParametersWhenNotAllowed",
  withNotAllowedEnv(function () {
    const p = createParams({
      database: "deno_postgres",
      user: "deno_postgres",
    });

    assertEquals(p.database, "deno_postgres");
    assertEquals(p.user, "deno_postgres");
    assert(is.function_(p.conn));
  }),
);

test("defaultParameters", function () {
  const p = createParams({
    database: "deno_postgres",
    user: "deno_postgres",
  });
  assertEquals(p.database, "deno_postgres");
  assertEquals(p.user, "deno_postgres");
  assert(is.function_(p.conn));
  assertEquals(p.password, undefined);
});

test("requiredParameters", function () {
  const error = assertThrows(
    () => createParams(),
    undefined,
    "Missing connection parameters: database, user",
  );

  assertEquals(error.name, "ConnectionParamsError");
});
