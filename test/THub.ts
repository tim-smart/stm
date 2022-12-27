import * as Deferred from "@effect/io/Deferred"
import * as Effect from "@effect/io/Effect"
import * as Fiber from "@effect/io/Fiber"
import * as STM from "@effect/stm/STM"
import * as it from "@effect/stm/test/utils/extend"
import * as THub from "@effect/stm/THub"
import * as TQueue from "@effect/stm/TQueue"
import { pipe } from "@fp-ts/data/Function"
import * as number from "@fp-ts/data/Number"
import * as RA from "@fp-ts/data/ReadonlyArray"
import * as fc from "fast-check"
import { assert, describe } from "vitest"

const sort: (array: ReadonlyArray<number>) => ReadonlyArray<number> = RA.sort(number.Order)

describe.concurrent("THub", () => {
  it.it("sequential publishers and subscribers - with one publisher and one subscriber", () =>
    fc.assert(fc.asyncProperty(fc.integer({ min: 1 }), fc.array(fc.integer()), async (n, as) => {
      const program = Effect.gen(function*($) {
        const deferred1 = yield* $(Deferred.make<never, void>())
        const deferred2 = yield* $(Deferred.make<never, void>())
        const hub = yield* $(THub.bounded<number>(n))
        const subscriber = yield* $(pipe(
          THub.subscribeScoped(hub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred1,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(Deferred.await(deferred2)),
              Effect.zipRight(pipe(
                as.slice(0, n),
                Effect.forEach(() => TQueue.take(subscription))
              ))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        yield* $(Deferred.await(deferred1))
        yield* $(pipe(
          as.slice(0, n),
          Effect.forEach((n) => pipe(hub, THub.publish(n)))
        ))
        yield* $(pipe(deferred2, Deferred.succeed<void>(void 0)))
        return yield* $(Fiber.join(subscriber))
      })
      const result = await Effect.unsafeRunPromise(program)
      assert.deepStrictEqual(Array.from(result), as.slice(0, n))
    })))

  it.it("sequential publishers and subscribers - with one publisher and two subscribers", () =>
    fc.assert(fc.asyncProperty(fc.integer({ min: 1 }), fc.array(fc.integer()), async (n, as) => {
      const program = Effect.gen(function*($) {
        const deferred1 = yield* $(Deferred.make<never, void>())
        const deferred2 = yield* $(Deferred.make<never, void>())
        const deferred3 = yield* $(Deferred.make<never, void>())
        const hub = yield* $(THub.bounded<number>(n))
        const subscriber1 = yield* $(pipe(
          THub.subscribeScoped(hub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred1,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(Deferred.await(deferred3)),
              Effect.zipRight(pipe(
                as.slice(0, n),
                Effect.forEach(() => TQueue.take(subscription))
              ))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        const subscriber2 = yield* $(pipe(
          THub.subscribeScoped(hub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred2,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(Deferred.await(deferred3)),
              Effect.zipRight(pipe(
                as.slice(0, n),
                Effect.forEach(() => TQueue.take(subscription))
              ))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        yield* $(Deferred.await(deferred1))
        yield* $(Deferred.await(deferred2))
        yield* $(pipe(
          as.slice(0, n),
          Effect.forEach((n) => pipe(hub, THub.publish(n)))
        ))
        yield* $(pipe(deferred3, Deferred.succeed<void>(void 0)))
        const result1 = yield* $(Fiber.join(subscriber1))
        const result2 = yield* $(Fiber.join(subscriber2))
        return { result1, result2 }
      })
      const { result1, result2 } = await Effect.unsafeRunPromise(program)
      assert.deepStrictEqual(Array.from(result1), as.slice(0, n))
      assert.deepStrictEqual(Array.from(result2), as.slice(0, n))
    })))

  it.it("concurrent publishers and subscribers - one to one", () =>
    fc.assert(fc.asyncProperty(fc.integer({ min: 1 }), fc.array(fc.integer()), async (n, as) => {
      const program = Effect.gen(function*($) {
        const deferred = yield* $(Deferred.make<never, void>())
        const hub = yield* $(THub.bounded<number>(n))
        const subscriber = yield* $(pipe(
          THub.subscribeScoped(hub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(as.slice(0, n), Effect.forEach(() => TQueue.take(subscription))))
            )
          ),
          Effect.fork
        ))
        yield* $(Deferred.await(deferred))
        yield* $(pipe(
          as.slice(0, n),
          Effect.forEach((n) => pipe(hub, THub.publish(n))),
          Effect.fork
        ))
        return yield* $(Fiber.join(subscriber))
      })
      const result = await Effect.unsafeRunPromise(Effect.scoped(program))
      assert.deepStrictEqual(Array.from(result), as.slice(0, n))
    })))

  it.it("concurrent publishers and subscribers - one to many", () =>
    fc.assert(fc.asyncProperty(fc.integer({ min: 1 }), fc.array(fc.integer()), async (n, as) => {
      const program = Effect.gen(function*($) {
        const deferred1 = yield* $(Deferred.make<never, void>())
        const deferred2 = yield* $(Deferred.make<never, void>())
        const hub = yield* $(THub.bounded<number>(n))
        const subscriber1 = yield* $(pipe(
          THub.subscribeScoped(hub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred1,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(as.slice(0, n), Effect.forEach(() => TQueue.take(subscription))))
            )
          ),
          Effect.fork
        ))
        const subscriber2 = yield* $(pipe(
          THub.subscribeScoped(hub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred2,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(as.slice(0, n), Effect.forEach(() => TQueue.take(subscription))))
            )
          ),
          Effect.fork
        ))
        yield* $(Deferred.await(deferred1))
        yield* $(Deferred.await(deferred2))
        yield* $(pipe(
          as.slice(0, n),
          Effect.forEach((n) => pipe(hub, THub.publish(n))),
          Effect.fork
        ))
        const result1 = yield* $(Fiber.join(subscriber1))
        const result2 = yield* $(Fiber.join(subscriber2))
        return { result1, result2 }
      })
      const { result1, result2 } = await Effect.unsafeRunPromise(Effect.scoped(program))
      assert.deepStrictEqual(Array.from(result1), as.slice(0, n))
      assert.deepStrictEqual(Array.from(result2), as.slice(0, n))
    })))

  it.it("concurrent publishers and subscribers - many to many", () =>
    fc.assert(fc.asyncProperty(fc.integer({ min: 1 }), fc.array(fc.integer({ min: 1 })), async (n, as) => {
      const program = Effect.gen(function*($) {
        const deferred1 = yield* $(Deferred.make<never, void>())
        const deferred2 = yield* $(Deferred.make<never, void>())
        const hub = yield* $(THub.bounded<number>(n * 2))
        const subscriber1 = yield* $(pipe(
          THub.subscribeScoped(hub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred1,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(
                [...as, ...as].slice(0, n * 2),
                Effect.forEach(() => TQueue.take(subscription))
              ))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        const subscriber2 = yield* $(pipe(
          THub.subscribeScoped(hub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred2,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(
                [...as, ...as].slice(0, n * 2),
                Effect.forEach(() => TQueue.take(subscription))
              ))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        yield* $(Deferred.await(deferred1))
        yield* $(Deferred.await(deferred2))
        yield* $(pipe(
          as.slice(0, n),
          Effect.forEach((n) => pipe(hub, THub.publish(n))),
          Effect.fork
        ))
        yield* $(pipe(
          as.slice(0, n).map((n) => n !== 0 ? -n : n),
          Effect.forEach((n) => pipe(hub, THub.publish(n))),
          Effect.fork
        ))
        const result1 = yield* $(Fiber.join(subscriber1))
        const result2 = yield* $(Fiber.join(subscriber2))
        return { result1, result2 }
      })
      const { result1, result2 } = await Effect.unsafeRunPromise(program)
      assert.deepStrictEqual(
        Array.from(result1).filter((n) => n > 0),
        as.slice(0, n)
      )
      assert.deepStrictEqual(
        Array.from(result1).filter((n) => n < 0),
        as.slice(0, n).map((n) => -n)
      )
      assert.deepStrictEqual(
        Array.from(result2).filter((n) => n > 0),
        as.slice(0, n)
      )
      assert.deepStrictEqual(
        Array.from(result2).filter((n) => n < 0),
        as.slice(0, n).map((n) => -n)
      )
    })))

  it.it("back pressure - one to one", () =>
    fc.assert(fc.asyncProperty(fc.integer({ min: 1 }), fc.array(fc.integer({ min: 1 })), async (n, as) => {
      const program = Effect.gen(function*($) {
        const deferred = yield* $(Deferred.make<never, void>())
        const hub = yield* $(THub.bounded<number>(n))
        const subscriber = yield* $(pipe(
          THub.subscribeScoped(hub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(as, Effect.forEach(() => TQueue.take(subscription))))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        yield* $(Deferred.await(deferred))
        yield* $(pipe(as, Effect.forEach((n) => pipe(hub, THub.publish(n))), Effect.fork))
        return yield* $(Fiber.join(subscriber))
      })
      const result = await Effect.unsafeRunPromise(program)
      assert.deepStrictEqual(Array.from(result), as)
    })))

  it.it("back pressure - one to many", () =>
    fc.assert(fc.asyncProperty(fc.integer({ min: 1 }), fc.array(fc.integer({ min: 1 })), async (n, as) => {
      const program = Effect.gen(function*($) {
        const deferred1 = yield* $(Deferred.make<never, void>())
        const deferred2 = yield* $(Deferred.make<never, void>())
        const hub = yield* $(THub.bounded<number>(n))
        const subscriber1 = yield* $(pipe(
          THub.subscribeScoped(hub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred1,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(as, Effect.forEach(() => TQueue.take(subscription))))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        const subscriber2 = yield* $(pipe(
          THub.subscribeScoped(hub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred2,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(as, Effect.forEach(() => TQueue.take(subscription))))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        yield* $(Deferred.await(deferred1))
        yield* $(Deferred.await(deferred2))
        yield* $(pipe(as, Effect.forEach((n) => pipe(hub, THub.publish(n))), Effect.fork))
        const result1 = yield* $(Fiber.join(subscriber1))
        const result2 = yield* $(Fiber.join(subscriber2))
        return { result1, result2 }
      })
      const { result1, result2 } = await Effect.unsafeRunPromise(program)
      assert.deepStrictEqual(Array.from(result1), as)
      assert.deepStrictEqual(Array.from(result2), as)
    })))

  it.it("back pressure - many to many", () =>
    fc.assert(fc.asyncProperty(fc.integer({ min: 1 }), fc.array(fc.integer({ min: 1 })), async (n, as) => {
      const program = Effect.gen(function*($) {
        const deferred1 = yield* $(Deferred.make<never, void>())
        const deferred2 = yield* $(Deferred.make<never, void>())
        const hub = yield* $(THub.bounded<number>(n * 2))
        const subscriber1 = yield* $(pipe(
          THub.subscribeScoped(hub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred1,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(
                [...as, ...as],
                Effect.forEach(() => TQueue.take(subscription))
              ))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        const subscriber2 = yield* $(pipe(
          THub.subscribeScoped(hub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred2,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(
                [...as, ...as],
                Effect.forEach(() => TQueue.take(subscription))
              ))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        yield* $(Deferred.await(deferred1))
        yield* $(Deferred.await(deferred2))
        yield* $(pipe(
          as,
          Effect.forEach((n) => pipe(hub, THub.publish(n))),
          Effect.fork
        ))
        yield* $(pipe(
          as.map((n) => -n),
          Effect.forEach((n) => pipe(hub, THub.publish(n))),
          Effect.fork
        ))
        const result1 = yield* $(Fiber.join(subscriber1))
        const result2 = yield* $(Fiber.join(subscriber2))
        return { result1, result2 }
      })
      const { result1, result2 } = await Effect.unsafeRunPromise(program)
      assert.deepStrictEqual(Array.from(result1).filter((n) => n > 0), as)
      assert.deepStrictEqual(Array.from(result1).filter((n) => n < 0), as.map((n) => -n))
      assert.deepStrictEqual(Array.from(result2).filter((n) => n > 0), as)
      assert.deepStrictEqual(Array.from(result2).filter((n) => n < 0), as.map((n) => -n))
    })))

  it.it("dropping - one to one", () =>
    fc.assert(fc.asyncProperty(fc.integer({ min: 1 }), fc.array(fc.integer({ min: 1 })), async (n, as) => {
      const program = Effect.gen(function*($) {
        const deferred = yield* $(Deferred.make<never, void>())
        const hub = yield* $(THub.dropping<number>(n))
        const subscriber = yield* $(pipe(
          THub.subscribeScoped(hub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(
                as.slice(0, n),
                Effect.forEach(() => TQueue.take(subscription))
              ))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        yield* $(Deferred.await(deferred))
        yield* $(pipe(as, Effect.forEach((n) => pipe(hub, THub.publish(n))), Effect.fork))
        return yield* $(Fiber.join(subscriber))
      })
      const result = await Effect.unsafeRunPromise(program)
      assert.deepStrictEqual(Array.from(result), as.slice(0, n))
    })))

  it.it("dropping - one to many", () =>
    fc.assert(fc.asyncProperty(fc.integer({ min: 1 }), fc.array(fc.integer({ min: 1 })), async (n, as) => {
      const program = Effect.gen(function*($) {
        const deferred1 = yield* $(Deferred.make<never, void>())
        const deferred2 = yield* $(Deferred.make<never, void>())
        const hub = yield* $(THub.dropping<number>(n))
        const subscriber1 = yield* $(pipe(
          THub.subscribeScoped(hub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred1,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(
                as.slice(0, n),
                Effect.forEach(() => TQueue.take(subscription))
              ))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        const subscriber2 = yield* $(pipe(
          THub.subscribeScoped(hub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred2,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(
                as.slice(0, n),
                Effect.forEach(() => TQueue.take(subscription))
              ))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        yield* $(Deferred.await(deferred1))
        yield* $(Deferred.await(deferred2))
        yield* $(pipe(as, Effect.forEach((n) => pipe(hub, THub.publish(n))), Effect.fork))
        const result1 = yield* $(Fiber.join(subscriber1))
        const result2 = yield* $(Fiber.join(subscriber2))
        return { result1, result2 }
      })
      const { result1, result2 } = await Effect.unsafeRunPromise(program)
      assert.deepStrictEqual(Array.from(result1), as.slice(0, n))
      assert.deepStrictEqual(Array.from(result2), as.slice(0, n))
    })))

  it.it("dropping - many to many", () =>
    fc.assert(fc.asyncProperty(fc.integer({ min: 1 }), fc.array(fc.integer({ min: 1 })), async (n, as) => {
      const program = Effect.gen(function*($) {
        const deferred1 = yield* $(Deferred.make<never, void>())
        const deferred2 = yield* $(Deferred.make<never, void>())
        const hub = yield* $(THub.dropping<number>(n * 2))
        const subscriber1 = yield* $(pipe(
          THub.subscribeScoped(hub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred1,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(
                [...as, ...as].slice(0, n * 2),
                Effect.forEach(() => TQueue.take(subscription))
              ))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        const subscriber2 = yield* $(pipe(
          THub.subscribeScoped(hub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred2,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(
                [...as, ...as].slice(0, n * 2),
                Effect.forEach(() => TQueue.take(subscription))
              ))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        yield* $(Deferred.await(deferred1))
        yield* $(Deferred.await(deferred2))
        yield* $(pipe(
          as,
          Effect.forEach((n) => pipe(hub, THub.publish(n))),
          Effect.fork
        ))
        yield* $(pipe(
          as.map((n) => -n),
          Effect.forEach((n) => pipe(hub, THub.publish(n))),
          Effect.fork
        ))
        const result1 = yield* $(Fiber.join(subscriber1))
        const result2 = yield* $(Fiber.join(subscriber2))
        return { result1, result2 }
      })
      const { result1, result2 } = await Effect.unsafeRunPromise(program)
      assert.deepStrictEqual(
        Array.from(result1).filter((n) => n > 0),
        as.slice(0, Array.from(result1).filter((n) => n > 0).length)
      )
      assert.deepStrictEqual(
        Array.from(result1).filter((n) => n < 0),
        as.slice(0, n).map((n) => -n).slice(0, Array.from(result1).filter((n) => n < 0).length)
      )
      assert.deepStrictEqual(
        Array.from(result2).filter((n) => n > 0),
        as.slice(0, Array.from(result2).filter((n) => n > 0).length)
      )
      assert.deepStrictEqual(
        Array.from(result2).filter((n) => n < 0),
        as.slice(0, n).map((n) => -n).slice(0, Array.from(result2).filter((n) => n < 0).length)
      )
    })))

  it.it("sliding - one to one", () =>
    fc.assert(fc.asyncProperty(fc.integer({ min: 1 }), fc.array(fc.integer({ min: 1 })), async (n, as) => {
      const program = Effect.gen(function*($) {
        const deferred = yield* $(Deferred.make<never, void>())
        const hub = yield* $(THub.sliding<number>(n))
        const subscriber = yield* $(pipe(
          THub.subscribeScoped(hub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(
                as.slice(0, n),
                Effect.forEach(() => TQueue.take(subscription))
              ))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        yield* $(Deferred.await(deferred))
        const publisher = yield* $(pipe(sort(as), Effect.forEach((n) => pipe(hub, THub.publish(n))), Effect.fork))
        yield* $(Fiber.join(publisher))
        return yield* $(Fiber.join(subscriber))
      })
      const result = await Effect.unsafeRunPromise(program)
      assert.deepStrictEqual(Array.from(result), sort(Array.from(result)))
    })))

  it.it("sliding - one to many", () =>
    fc.assert(fc.asyncProperty(fc.integer({ min: 1 }), fc.array(fc.integer({ min: 1 })), async (n, as) => {
      const program = Effect.gen(function*($) {
        const deferred1 = yield* $(Deferred.make<never, void>())
        const deferred2 = yield* $(Deferred.make<never, void>())
        const hub = yield* $(THub.sliding<number>(n))
        const subscriber1 = yield* $(pipe(
          THub.subscribeScoped(hub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred1,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(
                as.slice(0, n),
                Effect.forEach(() => TQueue.take(subscription))
              ))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        const subscriber2 = yield* $(pipe(
          THub.subscribeScoped(hub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred2,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(
                as.slice(0, n),
                Effect.forEach(() => TQueue.take(subscription))
              ))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        yield* $(Deferred.await(deferred1))
        yield* $(Deferred.await(deferred2))
        yield* $(pipe(sort(as), Effect.forEach((n) => pipe(hub, THub.publish(n))), Effect.fork))
        const result1 = yield* $(Fiber.join(subscriber1))
        const result2 = yield* $(Fiber.join(subscriber2))
        return { result1, result2 }
      })
      const { result1, result2 } = await Effect.unsafeRunPromise(program)
      assert.deepStrictEqual(Array.from(result1), sort(Array.from(result1)))
      assert.deepStrictEqual(Array.from(result2), sort(Array.from(result2)))
    })))

  it.it("sliding - many to many", () =>
    fc.assert(fc.asyncProperty(fc.integer({ min: 1 }), fc.array(fc.integer({ min: 1 })), async (n, as) => {
      const program = Effect.gen(function*($) {
        const deferred1 = yield* $(Deferred.make<never, void>())
        const deferred2 = yield* $(Deferred.make<never, void>())
        const hub = yield* $(THub.sliding<number>(n * 2))
        const subscriber1 = yield* $(pipe(
          THub.subscribeScoped(hub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred1,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(
                [...as, ...as].slice(0, n * 2),
                Effect.forEach(() => TQueue.take(subscription))
              ))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        const subscriber2 = yield* $(pipe(
          THub.subscribeScoped(hub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred2,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(
                [...as, ...as].slice(0, n * 2),
                Effect.forEach(() => TQueue.take(subscription))
              ))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        yield* $(Deferred.await(deferred1))
        yield* $(Deferred.await(deferred2))
        yield* $(pipe(
          sort(as),
          Effect.forEach((n) => pipe(hub, THub.publish(n))),
          Effect.fork
        ))
        yield* $(pipe(
          sort(as.map((n) => -n)),
          Effect.forEach((n) => pipe(hub, THub.publish(n))),
          Effect.fork
        ))
        const result1 = yield* $(Fiber.join(subscriber1))
        const result2 = yield* $(Fiber.join(subscriber2))
        return { result1, result2 }
      })
      const { result1, result2 } = await Effect.unsafeRunPromise(program)
      assert.deepStrictEqual(
        Array.from(result1).filter((n) => n > 0),
        sort(Array.from(result1).filter((n) => n > 0))
      )
      assert.deepStrictEqual(
        Array.from(result1).filter((n) => n < 0),
        sort(Array.from(result1).filter((n) => n < 0))
      )
      assert.deepStrictEqual(
        Array.from(result2).filter((n) => n > 0),
        sort(Array.from(result2).filter((n) => n > 0))
      )
      assert.deepStrictEqual(
        Array.from(result2).filter((n) => n < 0),
        sort(Array.from(result2).filter((n) => n < 0))
      )
    })))

  it.it("unbounded - one to one", () =>
    fc.assert(fc.asyncProperty(fc.array(fc.integer({ min: 1 })), async (as) => {
      const program = Effect.gen(function*($) {
        const deferred = yield* $(Deferred.make<never, void>())
        const hub = yield* $(THub.unbounded<number>())
        const subscriber = yield* $(pipe(
          STM.commit(THub.subscribe(hub)),
          Effect.flatMap((subscription) =>
            pipe(
              deferred,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(as, Effect.forEach(() => TQueue.take(subscription))))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        yield* $(Deferred.await(deferred))
        yield* $(pipe(as, Effect.forEach((n) => pipe(hub, THub.publish(n))), Effect.fork))
        return yield* $(Fiber.join(subscriber))
      })
      const result = await Effect.unsafeRunPromise(program)
      assert.deepStrictEqual(Array.from(result), as)
    })))

  it.it("unbounded - one to many", () =>
    fc.assert(fc.asyncProperty(fc.array(fc.integer({ min: 1 })), async (as) => {
      const program = Effect.gen(function*($) {
        const deferred1 = yield* $(Deferred.make<never, void>())
        const deferred2 = yield* $(Deferred.make<never, void>())
        const hub = yield* $(THub.unbounded<number>())
        const subscriber1 = yield* $(pipe(
          THub.subscribeScoped(hub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred1,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(as, Effect.forEach(() => TQueue.take(subscription))))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        const subscriber2 = yield* $(pipe(
          THub.subscribeScoped(hub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred2,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(as, Effect.forEach(() => TQueue.take(subscription))))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        yield* $(Deferred.await(deferred1))
        yield* $(Deferred.await(deferred2))
        yield* $(pipe(as, Effect.forEach((n) => pipe(hub, THub.publish(n))), Effect.fork))
        const result1 = yield* $(Fiber.join(subscriber1))
        const result2 = yield* $(Fiber.join(subscriber2))
        return { result1, result2 }
      })
      const { result1, result2 } = await Effect.unsafeRunPromise(program)
      assert.deepStrictEqual(Array.from(result1), as)
      assert.deepStrictEqual(Array.from(result2), as)
    })))

  it.it("unbounded - many to many", () =>
    fc.assert(fc.asyncProperty(fc.array(fc.integer({ min: 1 })), async (as) => {
      const program = Effect.gen(function*($) {
        const deferred1 = yield* $(Deferred.make<never, void>())
        const deferred2 = yield* $(Deferred.make<never, void>())
        const hub = yield* $(THub.unbounded<number>())
        const subscriber1 = yield* $(pipe(
          THub.subscribeScoped(hub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred1,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(
                [...as, ...as],
                Effect.forEach(() => TQueue.take(subscription))
              ))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        const subscriber2 = yield* $(pipe(
          THub.subscribeScoped(hub),
          Effect.flatMap((subscription) =>
            pipe(
              deferred2,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(pipe(
                [...as, ...as],
                Effect.forEach(() => TQueue.take(subscription))
              ))
            )
          ),
          Effect.scoped,
          Effect.fork
        ))
        yield* $(Deferred.await(deferred1))
        yield* $(Deferred.await(deferred2))
        yield* $(pipe(
          as,
          Effect.forEach((n) => pipe(hub, THub.publish(n))),
          Effect.fork
        ))
        yield* $(pipe(
          as.map((n) => -n),
          Effect.forEach((n) => pipe(hub, THub.publish(n))),
          Effect.fork
        ))
        const result1 = yield* $(Fiber.join(subscriber1))
        const result2 = yield* $(Fiber.join(subscriber2))
        return { result1, result2 }
      })
      const { result1, result2 } = await Effect.unsafeRunPromise(program)
      assert.deepStrictEqual(Array.from(result1).filter((n) => n > 0), as)
      assert.deepStrictEqual(Array.from(result1).filter((n) => n < 0), as.map((n) => -n))
      assert.deepStrictEqual(Array.from(result2).filter((n) => n > 0), as)
      assert.deepStrictEqual(Array.from(result2).filter((n) => n < 0), as.map((n) => -n))
    })))
})
