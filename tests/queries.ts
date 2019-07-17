import { test, assertEquals, TestFunction } from "../deps.ts";
import { Client } from "../mod.ts";
import { TEST_CONNECTION_PARAMS, DEFAULT_SETUP } from "./constants.ts";
import { getTestClient } from "./helpers.ts";

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
   const testStringEscaped = 'foo\\\\000\\\\200\\\\\\\\\\\\377';
   const testBuffer = new Deno.Buffer(new Uint8Array([102, 111, 111, 0, 128, 92, 255]));
   const result = await CLIENT.query(`SELECT E'${testStringEscaped}'::bytea;`);
   const row = result.rows[0];
   assertEquals(row[0], testBuffer);
   const testEmptyBuffer = new Deno.Buffer(new Uint8Array(0));
   const result2 = await CLIENT.query("SELECT ''::bytea;");
   const row2 = result2.rows[0];
   assertEquals(row2[0], testEmptyBuffer);
});