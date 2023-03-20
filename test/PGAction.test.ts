import { test } from "tap"
import { Pool, PoolClient } from "pg"

import { DBAction, Transactor, pure } from "../src/PG"

test("DBAction", async (t) => {
	const tr = new Transactor(new Pool())

	t.teardown(() => tr.close())

	t.test("should run a query", async (t) => {
		const res = await new DBAction((pool: PoolClient) =>
			pool.query("SELECT 42 AS num")
		)
			.map((res) => res.rows[0].num)
			.run(tr)

		t.ok(res === 42)
	})

	t.test("should transact a query", async (t) => {
		const res = await new DBAction((pool: PoolClient) =>
			pool.query("SELECT 43 AS num")
		)
			.map((res) => res.rows[0].num)
			.transact(tr)

		t.ok(res === 43)
	})
})

test("pure", async (t) => {
	const tr = new Transactor(new Pool())

	t.teardown(() => tr.close())

	t.test("should wrap a value with PGAction", async (t) => {
		const res = await pure(42).run(tr)
		t.ok(res === 42)
	})

	t.test("should wrap a promise with PGAction", async (t) => {
		const res = await pure(Promise.resolve(43)).run(tr)
		t.ok(res === 43)
	})

	t.test("should allow to lazy evaluate the promise", async (t) => {
		const res = await pure(() => Promise.resolve(44)).run(tr)
		t.ok(res === 44)
	})
})
