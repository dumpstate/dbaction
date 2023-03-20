import type { Pool, PoolClient } from "pg"

import {
	DBAction,
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

	public async *conn(): AsyncGenerator<PoolClient> {
		const conn = await this.pool.connect()

		try {
			yield conn
		} finally {
			conn.release()
		}
	}

	public async *transact(): AsyncGenerator<PoolClient> {
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
}

export type PGAction<T> = DBAction<Transactor, T>

export const flatten = <T>(actions: PGAction<T>[]): PGAction<T[]> =>
	dbFlatten(actions)
export const pure = <T>(p: Promise<T> | T | (() => Promise<T>)): PGAction<T> =>
	dbPure(p)

export function chain<A>(action: PGAction<A>): PGAction<A>
export function chain<A, B>(
	action: PGAction<A>,
	action2: (input: A) => PGAction<B>
): PGAction<B>
export function chain<A, B, C>(
	action: PGAction<A>,
	action2: (input: A) => PGAction<B>,
	action3: (input: B) => PGAction<C>
): PGAction<C>
export function chain<A, B, C, D>(
	action: PGAction<A>,
	action2: (input: A) => PGAction<B>,
	action3: (input: B) => PGAction<C>,
	action4: (input: C) => PGAction<D>
): PGAction<D>
export function chain<A, B, C, D, E>(
	action: PGAction<A>,
	action2: (input: A) => PGAction<B>,
	action3: (input: B) => PGAction<C>,
	action4: (input: C) => PGAction<D>,
	action5: (input: D) => PGAction<E>
): PGAction<E>
export function chain<A, B, C, D, E, F>(
	action: PGAction<A>,
	action2: (input: A) => PGAction<B>,
	action3: (input: B) => PGAction<C>,
	action4: (input: C) => PGAction<D>,
	action5: (input: D) => PGAction<E>,
	action6: (input: E) => PGAction<F>
): PGAction<F>
export function chain<A, B, C, D, E, F, G>(
	action: PGAction<A>,
	action2: (input: A) => PGAction<B>,
	action3: (input: B) => PGAction<C>,
	action4: (input: C) => PGAction<D>,
	action5: (input: D) => PGAction<E>,
	action6: (input: E) => PGAction<F>,
	action7: (input: F) => PGAction<G>
): PGAction<G>
export function chain<A, B, C, D, E, F, G, H>(
	action: PGAction<A>,
	action2: (input: A) => PGAction<B>,
	action3: (input: B) => PGAction<C>,
	action4: (input: C) => PGAction<D>,
	action5: (input: D) => PGAction<E>,
	action6: (input: E) => PGAction<F>,
	action7: (input: F) => PGAction<G>,
	action8: (input: G) => PGAction<H>
): PGAction<H>
export function chain<A, B, C, D, E, F, G, H, I>(
	action: PGAction<A>,
	action2: (input: A) => PGAction<B>,
	action3: (input: B) => PGAction<C>,
	action4: (input: C) => PGAction<D>,
	action5: (input: D) => PGAction<E>,
	action6: (input: E) => PGAction<F>,
	action7: (input: F) => PGAction<G>,
	action8: (input: G) => PGAction<H>,
	action9: (input: H) => PGAction<I>
): PGAction<I>
export function chain<A, B, C, D, E, F, G, H, I, J>(
	action: PGAction<A>,
	action2: (input: A) => PGAction<B>,
	action3: (input: B) => PGAction<C>,
	action4: (input: C) => PGAction<D>,
	action5: (input: D) => PGAction<E>,
	action6: (input: E) => PGAction<F>,
	action7: (input: F) => PGAction<G>,
	action8: (input: G) => PGAction<H>,
	action9: (input: H) => PGAction<I>,
	action10: (input: I) => PGAction<J>
): PGAction<J>
export function chain(
	action: PGAction<any>,
	...args: ((input: any) => PGAction<any>)[]
): PGAction<any> {
	return dbChain(action, ...(args as []))
}

export function sequence<A, B>(
	action: PGAction<A>,
	action2: PGAction<B>
): PGAction<[A, B]>
export function sequence<A, B, C>(
	action: PGAction<A>,
	action2: PGAction<B>,
	action3: PGAction<C>
): PGAction<[A, B, C]>
export function sequence<A, B, C, D>(
	action: PGAction<A>,
	action2: PGAction<B>,
	action3: PGAction<C>,
	action4: PGAction<D>
): PGAction<[A, B, C, D]>
export function sequence<A, B, C, D, E>(
	action: PGAction<A>,
	action2: PGAction<B>,
	action3: PGAction<C>,
	action4: PGAction<D>,
	action5: PGAction<E>
): PGAction<[A, B, C, D, E]>
export function sequence<A, B, C, D, E, F>(
	action: PGAction<A>,
	action2: PGAction<B>,
	action3: PGAction<C>,
	action4: PGAction<D>,
	action5: PGAction<E>,
	action6: PGAction<F>
): PGAction<[A, B, C, D, E, F]>
export function sequence(
	action: PGAction<any>,
	...args: PGAction<any>[]
): PGAction<any> {
	return (dbSequence as any)(action, ...(args as []))
}
