import { assertEquals } from "../test_deps.ts";
import { Client } from "../mod.ts";
import { TEST_CONNECTION_PARAMS, DEFAULT_SETUP } from "./constants.ts";
import { getTestClient } from "./helpers.ts";
import { QueryResult } from "../query.ts";

const CLIENT = new Client(TEST_CONNECTION_PARAMS);

const testClient = getTestClient(CLIENT, DEFAULT_SETUP);

testClient(async function simpleQuery() {
  const result = await CLIENT.query("SELECT * FROM ids;");
  assertEquals(result.rows.length, 2);
});

testClient(async function parametrizedQuery() {
  const result = await CLIENT.query("SELECT * FROM ids WHERE id < $1;", 2);
  assertEquals(result.rows.length, 1);

  const objectRows = result.rowsOfObjects();
  const row = objectRows[0];

  assertEquals(row.id, 1);
  assertEquals(typeof row.id, "number");
});

testClient(async function nativeType() {
  const result = await CLIENT.query("SELECT * FROM timestamps;");
  const row = result.rows[0];

  const expectedDate = Date.UTC(2019, 1, 10, 6, 0, 40, 5);

  assertEquals(row[0].toUTCString(), new Date(expectedDate).toUTCString());

  await CLIENT.query("INSERT INTO timestamps(dt) values($1);", new Date());
});

testClient(async function binaryType() {
  const result = await CLIENT.query("SELECT * from bytes;");
  const row = result.rows[0];

  const expectedBytes = new Uint8Array([102, 111, 111, 0, 128, 92, 255]);

  assertEquals(row[0], expectedBytes);

  await CLIENT.query("INSERT INTO bytes VALUES($1);", expectedBytes);
});

testClient(async function resultMetadata() {
  let result: QueryResult;

  // simple select
  result = await CLIENT.query("SELECT * FROM ids WHERE id = 100");
  assertEquals(result.command, "SELECT");
  assertEquals(result.rowCount, 1);

  // parameterized select
  result = await CLIENT.query(
    "SELECT * FROM ids WHERE id IN ($1, $2)",
    200,
    300
  );
  assertEquals(result.command, "SELECT");
  assertEquals(result.rowCount, 2);

  // simple delete
  result = await CLIENT.query("DELETE FROM ids WHERE id IN (100, 200)");
  assertEquals(result.command, "DELETE");
  assertEquals(result.rowCount, 2);

  // parameterized delete
  result = await CLIENT.query("DELETE FROM ids WHERE id = $1", 300);
  assertEquals(result.command, "DELETE");
  assertEquals(result.rowCount, 1);

  // simple insert
  result = await CLIENT.query("INSERT INTO ids VALUES (4), (5)");
  assertEquals(result.command, "INSERT");
  assertEquals(result.rowCount, 2);

  // parameterized insert
  result = await CLIENT.query("INSERT INTO ids VALUES ($1)", 3);
  assertEquals(result.command, "INSERT");
  assertEquals(result.rowCount, 1);

  // simple update
  result = await CLIENT.query(
    "UPDATE ids SET id = 500 WHERE id IN (500, 600)"
  );
  assertEquals(result.command, "UPDATE");
  assertEquals(result.rowCount, 2);

  // parameterized update
  result = await CLIENT.query("UPDATE ids SET id = 400 WHERE id = $1", 400);
  assertEquals(result.command, "UPDATE");
  assertEquals(result.rowCount, 1);
}, [
  "DROP TABLE IF EXISTS ids",
  "CREATE UNLOGGED TABLE ids (id integer)",
  "INSERT INTO ids VALUES (100), (200), (300), (400), (500), (600)"
]);
