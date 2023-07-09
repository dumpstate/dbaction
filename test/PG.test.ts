import assert from "node:assert/strict"

import { Pool, QueryResult } from "pg"

import { Transactor, chain, flatten, query, pure, sequence } from "../src/PG"

function getNum(res: QueryResult<any>): number {
	return parseInt(res.rows[0].num, 10)
}

describe("DBAction", () => {
	const tr = new Transactor(new Pool())

	before(() =>
		query("CREATE TABLE IF NOT EXISTS foo(bar INTEGER PRIMARY KEY)").run(
			tr,
		),
	)

	beforeEach(() => query("DELETE FROM foo").run(tr))

	after(async () => {
		await query("DROP TABLE IF EXISTS foo").transact(tr)
		await tr.close()
	})

	it("should run a query", async () => {
		const res = await query("SELECT 42 AS num").map(getNum).run(tr)

		assert(res === 42)
	})

	it("should transact a query", async () => {
		const res = await query("SELECT 43 AS num").map(getNum).transact(tr)

		assert(res === 43)
	})

	it("should flatMap onto another DBAction", async () => {
		const res = await query("SELECT 44 AS num")
			.map(getNum)
			.flatMap((num) => query("SELECT $1 + 1 AS num", num))
			.map(getNum)
			.run(tr)

		assert(res === 45)
	})

	it("should return just created record", async () => {
		const res = await chain(
			query("INSERT INTO foo (bar) VALUES (1), (2), (3)"),
			() => query("SELECT COUNT(*) AS num FROM foo").map(getNum),
		).transact(tr)

		assert.equal(res, 3)
	})

	it("should rollback transaction", async () => {
		await query("INSERT INTO foo (bar) VALUES (1)").transact(tr)

		try {
			await chain(query("INSERT INTO foo (bar) VALUES (2), (3)"), () =>
				query("INSERT INTO foo (bar) VALUES (3)"),
			)
				.map(getNum)
				.transact(tr)
		} catch (_) {}

		const res = await query("SELECT COUNT(*) AS num FROM foo")
			.map(getNum)
			.run(tr)

		assert.equal(res, 1)
	})

	it("should reject the promise on exception", async () => {
		assert.rejects(
			query("SELECT COUNT(*) FROM foo")
				.map(() => {
					throw new Error("error message")
				})
				.run(tr),
			{},
			"error message",
		)
	})
})

describe("DBAction utils", async () => {
	const tr = new Transactor(new Pool())

	after(() => tr.close())

	it("pure", async () => {
		it("should wrap a value with PGAction", async () => {
			const res = await pure(42).run(tr)
			assert(res === 42)
		})

		it("should wrap a promise with PGAction", async () => {
			const res = await pure(Promise.resolve(43)).run(tr)
			assert(res === 43)
		})

		it("should allow to lazy evaluate the promise", async () => {
			const res = await pure(() => Promise.resolve(44)).run(tr)
			assert(res === 44)
		})
	})

	it("flatten", async () => {
		it("should flatten list of DBActions", async () => {
			const res = await flatten([
				query("SELECT 1 AS num").map(getNum),
				query("SELECT 2 AS num").map(getNum),
				query("SELECT 3 AS num").map(getNum),
			])
				.map((items) => items.reduce((a, b) => a + b, 0))
				.run(tr)

			assert(res === 6)
		})
	})

	it("chain", async () => {
		it("should pass single action", async () => {
			const res = await chain(query("SELECT 1 AS NUM").map(getNum)).run(
				tr,
			)

			assert(res === 1)
		})

		it("should chain a sequence of actions", async () => {
			const res = await chain(
				query("SELECT 4 AS num").map(getNum),
				(prev) => query("SELECT $1 + 1 AS num", prev).map(getNum),
				(prev) => query("SELECT $1 + 1 AS num", prev).map(getNum),
			).run(tr)

			assert(res === 6)
		})
	})

	it("sequence", async () => {
		it("should pass single action", async () => {
			// casting to any, as it's not allowed by the type system
			const res = await (sequence as any)(
				query("SELECT 1 AS num").map(getNum),
			).run(tr)

			assert(res === 1)
		})

		it("should run a sequence of actions concurrently", async () => {
			const res = await sequence(
				query("SELECT 5 AS num").map(getNum),
				query("SELECT 6 AS num").map(getNum),
				query("SELECT 7 AS num").map(getNum),
			).run(tr)

			assert.deepEqual(res, [5, 6, 7])
		})
	})
})
