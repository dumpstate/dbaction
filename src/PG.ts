import type { Pool, PoolClient } from "pg"

import {
	DBAction as dbDBAction,
	chain as dbChain,
	flatten as dbFlatten,
	pure as dbPure,
	sequence as dbSequence,
} from "./DBAction"
import { Transactor as TransactorInterface } from "./Transactor"

export class Transactor implements TransactorInterface<PoolClient> {
	private readonly pool: Pool

	constructor(pool: Pool) {
		this.pool = pool
	}

	async *conn(): AsyncGenerator<PoolClient> {
		const conn = await this.pool.connect()

		try {
			yield conn
		} finally {
			conn.release()
		}
	}

	async *transact(): AsyncGenerator<PoolClient> {
		const conn = await this.pool.connect()

		try {
			await conn.query("BEGIN")
			yield conn
			await conn.query("COMMIT")
		} catch (err) {
			await conn.query("ROLLBACK")
			throw err
		} finally {
			conn.release()
		}
	}

	async close(): Promise<void> {
		await this.pool.end()
	}
}

export class DBAction<T> extends dbDBAction<PoolClient, T> {}

export const flatten = <T>(actions: DBAction<T>[]): DBAction<T[]> =>
	dbFlatten(actions)
export const pure = <T>(p: Promise<T> | T | (() => Promise<T>)): DBAction<T> =>
	dbPure(p)

export function chain<A>(action: DBAction<A>): DBAction<A>
export function chain<A, B>(
	action: DBAction<A>,
	action2: (input: A) => DBAction<B>
): DBAction<B>
export function chain<A, B, C>(
	action: DBAction<A>,
	action2: (input: A) => DBAction<B>,
	action3: (input: B) => DBAction<C>
): DBAction<C>
export function chain<A, B, C, D>(
	action: DBAction<A>,
	action2: (input: A) => DBAction<B>,
	action3: (input: B) => DBAction<C>,
	action4: (input: C) => DBAction<D>
): DBAction<D>
export function chain<A, B, C, D, E>(
	action: DBAction<A>,
	action2: (input: A) => DBAction<B>,
	action3: (input: B) => DBAction<C>,
	action4: (input: C) => DBAction<D>,
	action5: (input: D) => DBAction<E>
): DBAction<E>
export function chain<A, B, C, D, E, F>(
	action: DBAction<A>,
	action2: (input: A) => DBAction<B>,
	action3: (input: B) => DBAction<C>,
	action4: (input: C) => DBAction<D>,
	action5: (input: D) => DBAction<E>,
	action6: (input: E) => DBAction<F>
): DBAction<F>
export function chain<A, B, C, D, E, F, G>(
	action: DBAction<A>,
	action2: (input: A) => DBAction<B>,
	action3: (input: B) => DBAction<C>,
	action4: (input: C) => DBAction<D>,
	action5: (input: D) => DBAction<E>,
	action6: (input: E) => DBAction<F>,
	action7: (input: F) => DBAction<G>
): DBAction<G>
export function chain<A, B, C, D, E, F, G, H>(
	action: DBAction<A>,
	action2: (input: A) => DBAction<B>,
	action3: (input: B) => DBAction<C>,
	action4: (input: C) => DBAction<D>,
	action5: (input: D) => DBAction<E>,
	action6: (input: E) => DBAction<F>,
	action7: (input: F) => DBAction<G>,
	action8: (input: G) => DBAction<H>
): DBAction<H>
export function chain<A, B, C, D, E, F, G, H, I>(
	action: DBAction<A>,
	action2: (input: A) => DBAction<B>,
	action3: (input: B) => DBAction<C>,
	action4: (input: C) => DBAction<D>,
	action5: (input: D) => DBAction<E>,
	action6: (input: E) => DBAction<F>,
	action7: (input: F) => DBAction<G>,
	action8: (input: G) => DBAction<H>,
	action9: (input: H) => DBAction<I>
): DBAction<I>
export function chain<A, B, C, D, E, F, G, H, I, J>(
	action: DBAction<A>,
	action2: (input: A) => DBAction<B>,
	action3: (input: B) => DBAction<C>,
	action4: (input: C) => DBAction<D>,
	action5: (input: D) => DBAction<E>,
	action6: (input: E) => DBAction<F>,
	action7: (input: F) => DBAction<G>,
	action8: (input: G) => DBAction<H>,
	action9: (input: H) => DBAction<I>,
	action10: (input: I) => DBAction<J>
): DBAction<J>
export function chain(
	action: DBAction<any>,
	...args: ((input: any) => DBAction<any>)[]
): DBAction<any> {
	return dbChain(action, ...(args as []))
}

export function sequence<A, B>(
	action: DBAction<A>,
	action2: DBAction<B>
): DBAction<[A, B]>
export function sequence<A, B, C>(
	action: DBAction<A>,
	action2: DBAction<B>,
	action3: DBAction<C>
): DBAction<[A, B, C]>
export function sequence<A, B, C, D>(
	action: DBAction<A>,
	action2: DBAction<B>,
	action3: DBAction<C>,
	action4: DBAction<D>
): DBAction<[A, B, C, D]>
export function sequence<A, B, C, D, E>(
	action: DBAction<A>,
	action2: DBAction<B>,
	action3: DBAction<C>,
	action4: DBAction<D>,
	action5: DBAction<E>
): DBAction<[A, B, C, D, E]>
export function sequence<A, B, C, D, E, F>(
	action: DBAction<A>,
	action2: DBAction<B>,
	action3: DBAction<C>,
	action4: DBAction<D>,
	action5: DBAction<E>,
	action6: DBAction<F>
): DBAction<[A, B, C, D, E, F]>
export function sequence(
	action: DBAction<any>,
	...args: DBAction<any>[]
): DBAction<any> {
	return (dbSequence as any)(action, ...(args as []))
}
