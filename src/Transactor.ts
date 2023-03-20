export interface Transactor<C> {
	conn(): AsyncGenerator<C>
	transact(): AsyncGenerator<C>
}
