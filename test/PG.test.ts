import { test } from "tap"
import { Pool, QueryResult } from "pg"

import { Transactor, chain, flatten, query, pure, sequence } from "../src/PG"

function getNum(res: QueryResult<any>): number {
	return res.rows[0].num
}

test("DBAction", async (t) => {
	const tr = new Transactor(new Pool())

	t.before(() =>
		query("CREATE TABLE IF NOT EXISTS foo(bar INTEGER PRIMARY KEY)").run(tr)
	)

	t.beforeEach(() => query("DELETE FROM foo").run(tr))

	t.teardown(async () => {
		await query("DROP TABLE IF EXISTS foo").transact(tr)
		await tr.close()
	})

	t.test("should run a query", async (t) => {
		const res = await query("SELECT 42 AS num").map(getNum).run(tr)

		t.ok(res === 42)
	})

	t.test("should transact a query", async (t) => {
		const res = await query("SELECT 43 AS num").map(getNum).transact(tr)

		t.ok(res === 43)
	})

	t.test("should flatMap onto another DBAction", async (t) => {
		const res = await query("SELECT 44 AS num")
			.map(getNum)
			.flatMap((num) => query("SELECT $1 + 1 AS num", num))
			.map(getNum)
			.run(tr)

		t.ok(res === 45)
	})

	t.test("should return just created record", async (t) => {
		const res = await chain(
			query("INSERT INTO foo (bar) VALUES (1), (2), (3)"),
			() => query("SELECT COUNT(*) AS num FROM foo").map(getNum)
		).transact(tr)

		t.match(res, 3)
	})

	t.test("should rollback transaction", async (t) => {
		await query("INSERT INTO foo (bar) VALUES (1)").transact(tr)

		try {
			await chain(query("INSERT INTO foo (bar) VALUES (2), (3)"), () =>
				query("INSERT INTO foo (bar) VALUES (3)")
			)
				.map(getNum)
				.transact(tr)
		} catch (_) {}

		const res = await query("SELECT COUNT(*) AS num FROM foo")
			.map(getNum)
			.run(tr)

		t.match(res, 1)
	})

	t.test("should reject the promise on exception", async (t) => {
		t.rejects(
			query("SELECT COUNT(*) FROM foo")
				.map(() => {
					throw new Error("error message")
				})
				.run(tr),
			{},
			"error message"
		)
	})
})

test("DBAction utils", async (t) => {
	const tr = new Transactor(new Pool())

	t.teardown(() => tr.close())

	t.test("pure", async (t) => {
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

	t.test("flatten", async (t) => {
		t.test("should flatten list of DBActions", async (t) => {
			const res = await flatten([
				query("SELECT 1 AS num").map(getNum),
				query("SELECT 2 AS num").map(getNum),
				query("SELECT 3 AS num").map(getNum),
			])
				.map((items) => items.reduce((a, b) => a + b, 0))
				.run(tr)

			t.ok(res === 6)
		})
	})

	t.test("chain", async (t) => {
		t.test("should pass single action", async (t) => {
			const res = await chain(query("SELECT 1 AS NUM").map(getNum)).run(
				tr
			)

			t.ok(res === 1)
		})

		t.test("should chain a sequence of actions", async (t) => {
			const res = await chain(
				query("SELECT 4 AS num").map(getNum),
				(prev) => query("SELECT $1 + 1 AS num", prev).map(getNum),
				(prev) => query("SELECT $1 + 1 AS num", prev).map(getNum)
			).run(tr)

			t.ok(res === 6)
		})
	})

	t.test("sequence", async (t) => {
		t.test("should pass single action", async (t) => {
			// casting to any, as it's not allowed by the type system
			const res = await (sequence as any)(
				query("SELECT 1 AS num").map(getNum)
			).run(tr)

			t.ok(res === 1)
		})

		t.test("should run a sequence of actions concurrently", async (t) => {
			const res = await sequence(
				query("SELECT 5 AS num").map(getNum),
				query("SELECT 6 AS num").map(getNum),
				query("SELECT 7 AS num").map(getNum)
			).run(tr)

			t.match(res, [5, 6, 7])
		})
	})
})
