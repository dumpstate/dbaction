# dbaction

Reader monad for database connection.

## Install

Install package:

```sh
npm install @dumpstate/dbaction --save
```

## Import

There's either a generic `DBAction` available:

```ts
import { DBAction, Transactor, sequence, pure } from "@dumpstate/dbaction"
```

or PostgreSQL (`node-postgres`-based) specific:

```ts
import {
	DBAction,
	Transactor,
	sequence,
	pure,
} from "@dumpstate/dbaction/lib/PG"
```

PostgreSQL specific, requires `node-postgres` driver installed:

```sh
npm install pg --save
```

## Usage

```ts
import { Transactor, query } from "@dumpstate/dbaction/lib/PG"
import { Pool } from "pg"

// 1. Create connection pool.
const pool = new Pool({...})
// 2. Create transactor.
const tr = new Transactor(pool)

// 3. Build up some logic by chaining dbactions.
const action = query("SELECT COUNT(*) AS num FROM FOO")
    .map(res => res.rows[0].num)

// 4. Execute.
const res = await action.run(tr)
```

## Motivation

In a node.js, database-based applications one's usually maintains a connection pool. With a connection pool, when the logic wants to access the database, one's requests a connection from the pool, performs the operation then releases connection back to the pool so it's available for another routines.

Because of the nature of the databases, in order to achieve atomicity guarantees, some operations need to be performed on the same connection.

For example, let's say we have two repositories, each backed by a single table in a relational database.

```ts
class FooRepository {
    fetchById(id: string): Promise<Foo> { ... }
    create(foo: Foo): Promise<Foo> { ... }
}

class BarRepository {
    fetchById(id: string): Promise<Bar> { ... }
    create(bar: Bar): Promise<Bar> { ... }
}
```

and a logic, that wants to create `Foo` and `Bar` atomically:

```ts
const fooRepo = new FooRepository(...)
const barRepo = new BarRepo(...)

await fooRepo.create(new Foo(...))
await barRepo.create(new Bar(...))
```

from the connection pool perspective, one could bundle the pool into the repositories, like:

```ts
class FooRepository {
    private pool: Pool

    constructor(pool: Pool) { this.pool = pool }

    ...
}
```

and then, the logic may request the connection when it's needed. Two immediate problems:

1. it is not possible to create `Foo` and `Bar` atomically, as the operations may be performed on different connections,
2. as the connection pool is a finite resource, in some scenarios the application may end up in a deadlock state.

to fix the above, one could change the signature of all the repository methods, to accept the connection as an argument:

```ts
class FooRepository {
	fetchById(conn: PoolClient, id: string): Promise<Foo>
	create(conn: PoolClient, foo: Foo): Promise<Foo>
}
```

now, `Foo` and `Bar` could be created as:

```ts
const fooRepo = new FooRepository()
const barRepo = new BarRepository()

const pool = new Pool(...)
const conn = await pool.connect()

await conn.query("BEGIN")
await fooRepo.create(conn, new Foo(...))
await barRepo.create(conn, new Bar(...))
await conn.query("COMMIT")
```

where both `Foo` and `Bar` insert queries are executed on the same database connection, wrapped with `BEGIN` / `COMMIT` clause.

All is correct, except the code is polluted with the database connection as an argument.

Here comes the `DBAction` - a reader-like monad for a database connection as an environment. The logic of an application can now be written as a transformation of a monad, and then at the final step the owner of a reference to the monad may decide whether to just execute the program on a database connection or to wrap the monad with `BEGIN` / `COMMIT` transaction clause.

```ts
import { DBAction, Transactor, sequence } from "@dumpstate/dbaction/lib/PG"

class FooRepository {
    fetchById(id: string): DBAction<Foo>
    create(foo: Foo): DBAction<Foo>
}

class BarRepository {
    fetchById(id: string): DBAction<Bar>
    create(bar: Bar): DBAction<Bar>
}

const fooRepo = new FooRepository()
const barRepo = new BarRepository()

const pool = new Pool(...)
const tr = new Transactor(pool)

const [foo, bar] = await sequence(
    fooRepo.save(new Foo(...)),
    barRepo.save(new Bar(...)),
).transact(tr)
```

The `sequence` is just a utility to execute all operations contained within concurrently. Without `sequence`, one could simply chain the actions with `flatMap`.

```ts
await fooRepo.save(new Foo(...))
    .flatMap(() => barRepo.create(new Bar(...)))
    .transact(tr)
```

`DBAction` is a _cold_ set of instructions, thus a statement like:

```ts
fooRepo.save(new Foo(...))
    .flatMap(() => barRepo.create(new Bar(...)))
```

does not trigger any side effects, until either `run` or `transact` is called.

Both `run` and `transact` require an instance of a `Transactor` - i.e., a db-driver specific object that knows how to manage the lifecycle of a database connection.

## Documentation

The default `DBAction<A, B>` (imported from `@dumpstate/dbaction`), requires two generic parameters:

-   `A` - the connection type,
-   `B` - the value type.

For a driver specific `DBAction<B>` (imported from `@dumpstate/dbaction/lib/PG` - for postgres), the value type is the only parameter.

### DBAction

1. `.map<K>(fn: (item: T) => K)` - transforms value of type `T` into type `K` given a function `fn`.
2. `.flatMap<K>(fn: (item: T) => DBAction<K>)` - transforms value of type `T` into type `K` given a function `fn`, where a function returns a `DBAction<K>`; useful for chaining database operations, e.g., a result from the database query is an input for another database query.
3. `.run(tr: Transactor): Promise<T>` - requests connection from the pool, executes the query, releases connection, returns value.
4. `.transact(tr: Transactor): Promise<T>` - same as `run`, but wrapped with `BEGIN` / `COMMIT` / `ROLLBACK`.

### Utilities

1. `flatten` - given an array of `DBAction`s, returns a single `DBAction` with a value being an array of items.
2. `pure` - wraps either a scalar, a promise or a function returning promise as a `DBAction`, so a database operation can be composed with another, non-db, async operation.
3. `chain` - builds a sequential chain of `DBActions`, where a result of the previous is an input to the latter; returns the value of the last operation in the chain.
4. `sequence` - executes operations concurrently; returns a single `DBAction` being an array of values.
5. `query` - returns `DBAction` given the query string and query arguments.
