import { Transactor } from "./Transactor"
import { isFunction, isPromise } from "./utils"

export class DBAction<C, T> {
	private readonly _action: (conn: C) => Promise<T>

	constructor(action: (conn: C) => Promise<T>) {
		this._action = action
	}

	get action(): (conn: C) => Promise<T> {
		return this._action
	}

	public map<K>(fn: (item: T) => K): DBAction<C, K> {
		return new DBAction<C, K>((conn: C) => this._action(conn).then(fn))
	}

	public flatMap<K>(fn: (item: T) => DBAction<C, K>): DBAction<C, K> {
		return new DBAction<C, K>((conn: C) =>
			this._action(conn).then((item) => fn(item)._action(conn))
		)
	}

	public async run(tr: Transactor<C>): Promise<T> {
		const generator = tr.conn()
		const { value: conn } = await generator.next()
		const res = await this._action(conn)
		await generator.return(null)
		return res
	}

	public async transact(tr: Transactor<C>): Promise<T> {
		const generator = tr.transact()

		try {
			const { value: conn } = await generator.next()
			const res = await this._action(conn)
			await generator.return(null)
			return res
		} catch (err) {
			await generator.throw(err)
			throw err
		}
	}
}

export function flatten<C, T>(actions: DBAction<C, T>[]): DBAction<C, T[]> {
	return actions.reduce(
		(acc, next) =>
			acc.flatMap((items) => next.map((item) => items.concat(item))),
		pure<C, T[]>([])
	)
}

export function pure<C, T>(
	p: Promise<T> | T | (() => Promise<T>)
): DBAction<C, T> {
	if (isPromise(p)) {
		return new DBAction<C, T>((_: C) => p)
	} else if (isFunction(p)) {
		return new DBAction<C, T>((_: C) => p())
	} else {
		return new DBAction((_: C) => Promise.resolve(p))
	}
}

export function chain<X, A>(action: DBAction<X, A>): DBAction<X, A>
export function chain<X, A, B>(
	action: DBAction<X, A>,
	action2: (input: A) => DBAction<X, B>
): DBAction<X, B>
export function chain<X, A, B, C>(
	action: DBAction<X, A>,
	action2: (input: A) => DBAction<X, B>,
	action3: (input: B) => DBAction<X, C>
): DBAction<X, C>
export function chain<X, A, B, C, D>(
	action: DBAction<X, A>,
	action2: (input: A) => DBAction<X, B>,
	action3: (input: B) => DBAction<X, C>,
	action4: (input: C) => DBAction<X, D>
): DBAction<X, D>
export function chain<X, A, B, C, D, E>(
	action: DBAction<X, A>,
	action2: (input: A) => DBAction<X, B>,
	action3: (input: B) => DBAction<X, C>,
	action4: (input: C) => DBAction<X, D>,
	action5: (input: D) => DBAction<X, E>
): DBAction<X, E>
export function chain<X, A, B, C, D, E, F>(
	action: DBAction<X, A>,
	action2: (input: A) => DBAction<X, B>,
	action3: (input: B) => DBAction<X, C>,
	action4: (input: C) => DBAction<X, D>,
	action5: (input: D) => DBAction<X, E>,
	action6: (input: E) => DBAction<X, F>
): DBAction<X, F>
export function chain<X, A, B, C, D, E, F, G>(
	action: DBAction<X, A>,
	action2: (input: A) => DBAction<X, B>,
	action3: (input: B) => DBAction<X, C>,
	action4: (input: C) => DBAction<X, D>,
	action5: (input: D) => DBAction<X, E>,
	action6: (input: E) => DBAction<X, F>,
	action7: (input: F) => DBAction<X, G>
): DBAction<X, G>
export function chain<X, A, B, C, D, E, F, G, H>(
	action: DBAction<X, A>,
	action2: (input: A) => DBAction<X, B>,
	action3: (input: B) => DBAction<X, C>,
	action4: (input: C) => DBAction<X, D>,
	action5: (input: D) => DBAction<X, E>,
	action6: (input: E) => DBAction<X, F>,
	action7: (input: F) => DBAction<X, G>,
	action8: (input: G) => DBAction<X, H>
): DBAction<X, H>
export function chain<X, A, B, C, D, E, F, G, H, I>(
	action: DBAction<X, A>,
	action2: (input: A) => DBAction<X, B>,
	action3: (input: B) => DBAction<X, C>,
	action4: (input: C) => DBAction<X, D>,
	action5: (input: D) => DBAction<X, E>,
	action6: (input: E) => DBAction<X, F>,
	action7: (input: F) => DBAction<X, G>,
	action8: (input: G) => DBAction<X, H>,
	action9: (input: H) => DBAction<X, I>
): DBAction<X, I>
export function chain<X, A, B, C, D, E, F, G, H, I, J>(
	action: DBAction<X, A>,
	action2: (input: A) => DBAction<X, B>,
	action3: (input: B) => DBAction<X, C>,
	action4: (input: C) => DBAction<X, D>,
	action5: (input: D) => DBAction<X, E>,
	action6: (input: E) => DBAction<X, F>,
	action7: (input: F) => DBAction<X, G>,
	action8: (input: G) => DBAction<X, H>,
	action9: (input: H) => DBAction<X, I>,
	action10: (input: I) => DBAction<X, J>
): DBAction<X, J>
export function chain(
	action: DBAction<any, any>,
	...args: ((input: any) => DBAction<any, any>)[]
): DBAction<any, any> {
	if (!args || args.length === 0) {
		return action
	}

	return args.reduce((acc, next) => acc.flatMap((res) => next(res)), action)
}

export function sequence<X, A, B>(
	action: DBAction<X, A>,
	action2: DBAction<X, B>
): DBAction<X, [A, B]>
export function sequence<X, A, B, C>(
	action: DBAction<X, A>,
	action2: DBAction<X, B>,
	action3: DBAction<X, C>
): DBAction<X, [A, B, C]>
export function sequence<X, A, B, C, D>(
	action: DBAction<X, A>,
	action2: DBAction<X, B>,
	action3: DBAction<X, C>,
	action4: DBAction<X, D>
): DBAction<X, [A, B, C, D]>
export function sequence<X, A, B, C, D, E>(
	action: DBAction<X, A>,
	action2: DBAction<X, B>,
	action3: DBAction<X, C>,
	action4: DBAction<X, D>,
	action5: DBAction<X, E>
): DBAction<X, [A, B, C, D, E]>
export function sequence<X, A, B, C, D, E, F>(
	action: DBAction<X, A>,
	action2: DBAction<X, B>,
	action3: DBAction<X, C>,
	action4: DBAction<X, D>,
	action5: DBAction<X, E>,
	action6: DBAction<X, F>
): DBAction<X, [A, B, C, D, E, F]>
export function sequence(
	action: DBAction<any, any>,
	...args: DBAction<any, any>[]
): DBAction<any, any> {
	if (!args || args.length === 0) {
		return action
	}

	return new DBAction((conn: any) =>
		Promise.all([action, ...args].map((act) => act.action(conn)))
	)
}
