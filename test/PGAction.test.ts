import { test } from "tap"
import { Pool } from "pg"

import { Transactor, pure } from "../src/PG"

test("pure", async (t) => {
	const tr = new Transactor(new Pool())

	t.teardown(async () => {
		await tr.close()
	})

	await t.test("should wrap a value with PGAction", async (t) => {
		const res = await pure(42).run(tr)
		t.ok(res === 42)
	})

	await t.test("should wrap a promise with PGAction", async (t) => {
		const res = await pure(Promise.resolve(43)).run(tr)
		t.ok(res === 43)
	})

	await t.test("should allow to lazy evaluate the promise", async (t) => {
		const res = await pure(() => Promise.resolve(44)).run(tr)
		t.ok(res === 44)
	})
})
