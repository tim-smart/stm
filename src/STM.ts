/**
 * @since 1.0.0
 */
import type * as Cause from "@effect/io/Cause"
import type * as Effect from "@effect/io/Effect"
import type * as FiberId from "@effect/io/Fiber/Id"
import type { EnforceNonEmptyRecord } from "@effect/io/src/internal/types"
import * as core from "@effect/stm/internal/core"
import * as stm from "@effect/stm/internal/stm"
import type { NonEmptyArraySTM, TupleSTM } from "@effect/stm/internal/types"
import type * as Chunk from "@fp-ts/data/Chunk"
import type * as Context from "@fp-ts/data/Context"
import type * as Either from "@fp-ts/data/Either"
import type { LazyArg } from "@fp-ts/data/Function"
import type * as Option from "@fp-ts/data/Option"
import type { Predicate } from "@fp-ts/data/Predicate"

/**
 * @since 1.0.0
 * @category symbols
 */
export const STMTypeId: unique symbol = core.STMTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type STMTypeId = typeof STMTypeId

/**
 * `STM<R, E, A>` represents an effect that can be performed transactionally,
 *  resulting in a failure `E` or a value `A` that may require an environment
 *  `R` to execute.
 *
 * Software Transactional Memory is a technique which allows composition of
 * arbitrary atomic operations.  It is the software analog of transactions in
 * database systems.
 *
 * The API is lifted directly from the Haskell package Control.Concurrent.STM
 * although the implementation does not resemble the Haskell one at all.
 *
 * See http://hackage.haskell.org/package/stm-2.5.0.0/docs/Control-Concurrent-STM.html
 *
 * STM in Haskell was introduced in:
 *
 * Composable memory transactions, by Tim Harris, Simon Marlow, Simon Peyton
 * Jones, and Maurice Herlihy, in ACM Conference on Principles and Practice of
 * Parallel Programming 2005.
 *
 * See https://www.microsoft.com/en-us/research/publication/composable-memory-transactions/
 *
 * See also:
 *  Lock Free Data Structures using STMs in Haskell, by Anthony Discolo, Tim
 *  Harris, Simon Marlow, Simon Peyton Jones, Satnam Singh) FLOPS 2006: Eighth
 *  International Symposium on Functional and Logic Programming, Fuji Susono,
 *  JAPAN, April 2006
 *
 *  https://www.microsoft.com/en-us/research/publication/lock-free-data-structures-using-stms-in-haskell/
 *
 * The implemtation is based on the ZIO STM module, while JS environments have
 * no race conditions from multiple threads STM provides greater benefits for
 * synchronization of Fibers and transactional data-types can be quite useful.
 *
 * @since 1.0.0
 * @category models
 */
export interface STM<R, E, A> extends STM.Variance<R, E, A>, Effect.Effect<R, E, A> {
  /** @internal */
  trace: string | undefined
  /** @internal */
  traced(trace: string | undefined): STM<R, E, A>
  /** @internal */
  commit(): Effect.Effect<R, E, A>
}

/**
 * @since 1.0.0
 */
export declare namespace STM {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Variance<R, E, A> {
    readonly [STMTypeId]: {
      readonly _R: (_: never) => R
      readonly _E: (_: never) => E
      readonly _A: (_: never) => A
    }
  }
}

/**
 * Returns an effect that submerges the error case of an `Either` into the
 * `STM`. The inverse operation of `STM.either`.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const absolve: <R, E, E2, A>(self: STM<R, E, Either.Either<E2, A>>) => STM<R, E | E2, A> = stm.absolve

/**
 * Maps the success value of this effect to the specified constant value.
 *
 * @macro traced
 * @since 1.0.0
 * @category mapping
 */
export const as: <A2>(value: A2) => <R, E, A>(self: STM<R, E, A>) => STM<R, E, A2> = stm.as

/**
 * Maps the success value of this effect to an optional value.
 *
 * @macro traced
 * @since 1.0.0
 * @category mapping
 */
export const asSome: <R, E, A>(self: STM<R, E, A>) => STM<R, E, Option.Option<A>> = stm.asSome

/**
 * Maps the error value of this effect to an optional value.
 *
 * @macro traced
 * @since 1.0.0
 * @category mapping
 */
export const asSomeError: <R, E, A>(self: STM<R, E, A>) => STM<R, Option.Option<E>, A> = stm.asSomeError

/**
 * Treats the specified `acquire` transaction as the acquisition of a
 * resource. The `acquire` transaction will be executed interruptibly. If it
 * is a success and is committed the specified `release` workflow will be
 * executed uninterruptibly as soon as the `use` workflow completes execution.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const acquireUseRelease: <R, E, A, R2, E2, A2, R3, E3, A3>(
  acquire: STM<R, E, A>,
  use: (resource: A) => STM<R2, E2, A2>,
  release: (resource: A) => STM<R3, E3, A3>
) => Effect.Effect<R | R2 | R3, E | E2 | E3, A2> = stm.acquireUseRelease

/**
 * Creates an `STM` value from a partial (but pure) function.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const attempt: <A>(evaluate: LazyArg<A>) => STM<never, unknown, A> = stm.attempt

/**
 * Recovers from all errors.
 *
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const catchAll: <E, R1, E1, B>(
  f: (e: E) => STM<R1, E1, B>
) => <R, A>(self: STM<R, E, A>) => STM<R1 | R, E1, B | A> = core.catchAll

/**
 * Recovers from some or all of the error cases.
 *
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const catchSome: <E, R2, E2, A2>(
  pf: (error: E) => Option.Option<STM<R2, E2, A2>>
) => <R, A>(self: STM<R, E, A>) => STM<R2 | R, E | E2, A2 | A> = stm.catchSome

/**
 * Checks the condition, and if it's true, returns unit, otherwise, retries.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const check: (predicate: LazyArg<boolean>) => STM<never, never, void> = stm.check

/**
 * Simultaneously filters and maps the value produced by this effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const collect: <A, A2>(pf: (a: A) => Option.Option<A2>) => <R, E>(self: STM<R, E, A>) => STM<R, E, A2> =
  stm.collect

/**
 * Collects all the transactional effects in a collection, returning a single
 * transactional effect that produces a collection of values.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const collectAll: <R, E, A>(iterable: Iterable<STM<R, E, A>>) => STM<R, E, Chunk.Chunk<A>> = stm.collectAll

/**
 * Collects all the transactional effects, returning a single transactional
 * effect that produces `Unit`.
 *
 * Equivalent to `pipe(icollectAll(iterable), asUnit)`, but without the cost
 * of building the list of results.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const collectAllDiscard: <R, E, A>(iterable: Iterable<STM<R, E, A>>) => STM<R, E, void> = stm.collectAllDiscard

/**
 * Collects the first element of the `Iterable<A>` for which the effectual
 * function `f` returns `Some`.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const collectFirst: <A, R, E, A2>(
  pf: (a: A) => STM<R, E, Option.Option<A2>>
) => (iterable: Iterable<A>) => STM<R, E, Option.Option<A2>> = stm.collectFirst

/**
 * Simultaneously filters and flatMaps the value produced by this effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const collectSTM: <A, R2, E2, A2>(
  pf: (a: A) => Option.Option<STM<R2, E2, A2>>
) => <R, E>(self: STM<R, E, A>) => STM<R2 | R, E2 | E, A2> = stm.collectSTM

/**
 * Commits this transaction atomically.
 *
 * @macro traced
 * @since 1.0.0
 * @category destructors
 */
export const commit: <R, E, A>(self: STM<R, E, A>) => Effect.Effect<R, E, A> = core.commit

/**
 * Commits this transaction atomically, regardless of whether the transaction
 * is a success or a failure.
 *
 * @macro traced
 * @since 1.0.0
 * @category destructors
 */
export const commitEither: <R, E, A>(self: STM<R, E, A>) => Effect.Effect<R, E, A> = stm.commitEither

/**
 * Similar to Either.cond, evaluate the predicate, return the given A as
 * success if predicate returns true, and the given E as error otherwise
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const cond: <E, A>(predicate: LazyArg<boolean>, error: LazyArg<E>, result: LazyArg<A>) => STM<never, E, A> =
  stm.cond

/**
 * Fails the transactional effect with the specified defect.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const die: (defect: unknown) => STM<never, never, never> = core.die

/**
 * Kills the fiber running the effect with a `Cause.RuntimeException` that
 * contains the specified message.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const dieMessage: (message: string) => STM<never, never, never> = core.dieMessage

/**
 * Fails the transactional effect with the specified lazily evaluated defect.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const dieSync: (evaluate: LazyArg<unknown>) => STM<never, never, never> = core.dieSync

/**
 * Converts the failure channel into an `Either`.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const either: <R, E, A>(self: STM<R, E, A>) => STM<R, never, Either.Either<E, A>> = stm.either

/**
 * Executes the specified finalization transaction whether or not this effect
 * succeeds. Note that as with all STM transactions, if the full transaction
 * fails, everything will be rolled back.
 *
 * @macro traced
 * @since 1.0.0
 * @category finalization
 */
export const ensuring: <R1, B>(
  finalizer: STM<R1, never, B>
) => <R, E, A>(self: STM<R, E, A>) => STM<R1 | R, E, A> = core.ensuring

/**
 * Retrieves the environment inside an stm.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const environment: <R>() => STM<R, never, Context.Context<R>> = stm.environment

/**
 * Accesses the environment of the transaction to perform a transaction.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const environmentWith: <R0, R>(f: (environment: Context.Context<R0>) => R) => STM<R0, never, R> =
  stm.environmentWith

/**
 * Accesses the environment of the transaction to perform a transaction.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const environmentWithSTM: <R0, R, E, A>(
  f: (environment: Context.Context<R0>) => STM<R, E, A>
) => STM<R0 | R, E, A> = stm.environmentWithSTM

/**
 * Returns an effect that ignores errors and runs repeatedly until it
 * eventually succeeds.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const eventually: <R, E, A>(self: STM<R, E, A>) => STM<R, E, A> = stm.eventually

/**
 * Determines whether all elements of the `Iterable<A>` satisfy the effectual
 * predicate.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const every: <A, R, E>(
  predicate: (a: A) => STM<R, E, boolean>
) => (iterable: Iterable<A>) => STM<R, E, boolean> = stm.every

/**
 * Determines whether any element of the `Iterable[A]` satisfies the effectual
 * predicate `f`.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const exists: <A, R, E>(
  predicate: (a: A) => STM<R, E, boolean>
) => (iterable: Iterable<A>) => STM<R, E, boolean> = stm.exists

/**
 * Fails the transactional effect with the specified error.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const fail: <E>(error: E) => STM<never, E, never> = core.fail

/**
 * Fails the transactional effect with the specified lazily evaluated error.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const failSync: <E>(evaluate: LazyArg<E>) => STM<never, E, never> = core.failSync

/**
 * Returns the fiber id of the fiber committing the transaction.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const fiberId: () => STM<never, never, FiberId.FiberId> = stm.fiberId

/**
 * Filters the collection using the specified effectual predicate.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const filter: <A, R, E>(
  predicate: (a: A) => STM<R, E, boolean>
) => (iterable: Iterable<A>) => STM<R, E, Chunk.Chunk<A>> = stm.filter

/**
 * Filters the collection using the specified effectual predicate, removing
 * all elements that satisfy the predicate.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const filterNot: <A, R, E>(
  predicate: (a: A) => STM<R, E, boolean>
) => (iterable: Iterable<A>) => STM<R, E, Chunk.Chunk<A>> = stm.filterNot

/**
 * Dies with specified defect if the predicate fails.
 *
 * @macro traced
 * @since 1.0.0
 * @category filtering
 */
export const filterOrDie: <A>(
  predicate: Predicate<A>,
  defect: LazyArg<unknown>
) => <R, E>(self: STM<R, E, A>) => STM<R, E, A> = stm.filterOrDie

/**
 * Dies with a `Cause.RuntimeException` having the specified  message if the
 * predicate fails.
 *
 * @macro traced
 * @since 1.0.0
 * @category filtering
 */
export const filterOrDieMessage: <A>(
  predicate: Predicate<A>,
  message: string
) => <R, E>(self: STM<R, E, A>) => STM<R, E, A> = stm.filterOrDieMessage

/**
 * Supplies `orElse` if the predicate fails.
 *
 * @macro traced
 * @since 1.0.0
 * @category filtering
 */
export const filterOrElse: <A, R2, E2, A2>(
  predicate: Predicate<A>,
  orElse: LazyArg<STM<R2, E2, A2>>
) => <R, E>(self: STM<R, E, A>) => STM<R2 | R, E2 | E, A | A2> = stm.filterOrElse

/**
 * Applies `orElse` if the predicate fails.
 *
 * @macro traced
 * @since 1.0.0
 * @category filtering
 */
export const filterOrElseWith: <A, R2, E2, A2>(
  predicate: Predicate<A>,
  orElse: (a: A) => STM<R2, E2, A2>
) => <R, E>(self: STM<R, E, A>) => STM<R2 | R, E2 | E, A | A2> = stm.filterOrElseWith

/**
 * Fails with the specified error if the predicate fails.
 *
 * @macro traced
 * @since 1.0.0
 * @category filtering
 */
export const filterOrFail: <A, E2>(
  predicate: Predicate<A>,
  error: LazyArg<E2>
) => <R, E>(self: STM<R, E, A>) => STM<R, E2 | E, A> = stm.filterOrFail

/**
 * Feeds the value produced by this effect to the specified function, and then
 * runs the returned effect as well to produce its results.
 *
 * @macro traced
 * @since 1.0.0
 * @category sequencing
 */
export const flatMap: <A, R1, E1, A2>(
  f: (a: A) => STM<R1, E1, A2>
) => <R, E>(self: STM<R, E, A>) => STM<R1 | R, E1 | E, A2> = core.flatMap

/**
 * Creates a composite effect that represents this effect followed by another
 * one that may depend on the error produced by this one.
 *
 * @macro traced
 * @since 1.0.0
 * @category sequencing
 */
export const flatMapError: <E, R2, E2>(
  f: (error: E) => STM<R2, never, E2>
) => <R, A>(self: STM<R, E, A>) => STM<R2 | R, E2, A> = stm.flatMapError

/**
 * Flattens out a nested `STM` effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category sequencing
 */
export const flatten: <R, E, R2, E2, A>(self: STM<R, E, STM<R2, E2, A>>) => STM<R | R2, E | E2, A> = stm.flatten

/**
 * Unwraps the optional error, defaulting to the provided value.
 *
 * @macro traced
 * @since 1.0.0
 * @category sequencing
 */
export const flattenErrorOption: <E2>(
  fallback: LazyArg<E2>
) => <R, E, A>(self: STM<R, Option.Option<E>, A>) => STM<R, E2 | E, A> = stm.flattenErrorOption

/**
 * Flips the success and failure channels of this transactional effect. This
 * allows you to use all methods on the error channel, possibly before
 * flipping back.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const flip: <R, E, A>(self: STM<R, E, A>) => STM<R, A, E> = stm.flip

/**
 * Swaps the error/value parameters, applies the function `f` and flips the
 * parameters back
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const flipWith: <R, A, E, R2, A2, E2>(
  f: (stm: STM<R, A, E>) => STM<R2, A2, E2>
) => (self: STM<R, E, A>) => STM<R | R2, E | E2, A | A2> = stm.flipWith

/**
 * Folds over the `STM` effect, handling both failure and success, but not
 * retry.
 *
 * @macro traced
 * @since 1.0.0
 * @category folding
 */
export const fold: <E, A2, A, A3>(
  f: (error: E) => A2,
  g: (value: A) => A3
) => <R>(self: STM<R, E, A>) => STM<R, E, A2 | A3> = stm.fold

/**
 * Effectfully folds over the `STM` effect, handling both failure and success.
 *
 * @macro traced
 * @since 1.0.0
 * @category folding
 */
export const foldSTM: <E, R1, E1, A1, A, R2, E2, A2>(
  onFailure: (e: E) => STM<R1, E1, A1>,
  onSuccess: (a: A) => STM<R2, E2, A2>
) => <R>(self: STM<R, E, A>) => STM<R1 | R2 | R, E1 | E2, A1 | A2> = core.foldSTM

/**
 * Applies the function `f` to each element of the `Iterable<A>` and returns
 * a transactional effect that produces a new `Chunk<A2>`.
 *
 * @macro traced
 * @since 1.0.0
 * @category traversing
 */
export const forEach: <A, R, E, A2>(
  f: (a: A) => STM<R, E, A2>
) => (elements: Iterable<A>) => STM<R, E, Chunk.Chunk<A2>> = stm.forEach

/**
 * Applies the function `f` to each element of the `Iterable<A>` and returns a
 * transactional effect that produces the unit result.
 *
 * Equivalent to `pipe(as, forEach(f), asUnit)`, but without the cost of
 * building the list of results.
 *
 * @macro traced
 * @since 1.0.0
 * @category traversing
 */
export const forEachDiscard: <A, R, E, _>(f: (a: A) => STM<R, E, _>) => (iterable: Iterable<A>) => STM<R, E, void> =
  stm.forEachDiscard

/**
 * Lifts an `Either` into a `STM`.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const fromEither: <E, A>(either: Either.Either<E, A>) => STM<never, E, A> = stm.fromEither

/**
 * Lifts an `Option` into a `STM`.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const fromOption: <A>(option: Option.Option<A>) => STM<never, Option.Option<never>, A> = stm.fromOption

/**
 * Returns a successful effect with the head of the list if the list is
 * non-empty or fails with the error `None` if the list is empty.
 *
 * @macro traced
 * @since 1.0.0
 * @category getters
 */
export const head: <R, E, A>(self: STM<R, E, Iterable<A>>) => STM<R, Option.Option<E>, A> = stm.head

/**
 * Runs `onTrue` if the result of `b` is `true` and `onFalse` otherwise.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const ifSTM: <R1, R2, E1, E2, A, A1>(
  onTrue: STM<R1, E1, A>,
  onFalse: STM<R2, E2, A1>
) => <R, E>(self: STM<R, E, boolean>) => STM<R1 | R2 | R, E1 | E2 | E, A | A1> = stm.ifSTM

/**
 * Returns a new effect that ignores the success or failure of this effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const ignore: <R, E, A>(self: STM<R, E, A>) => STM<R, never, void> = stm.ignore

/**
 * Interrupts the fiber running the effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const interrupt: () => STM<never, never, never> = core.interrupt

/**
 * Interrupts the fiber running the effect with the specified `FiberId`.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const interruptWith: (fiberId: FiberId.FiberId) => STM<never, never, never> = core.interruptWith

/**
 * Returns whether this transactional effect is a failure.
 *
 * @macro traced
 * @since 1.0.0
 * @category getters
 */
export const isFailure: <R, E, A>(self: STM<R, E, A>) => STM<R, never, boolean> = stm.isFailure

/**
 * Returns whether this transactional effect is a success.
 *
 * @macro traced
 * @since 1.0.0
 * @category getters
 */
export const isSuccess: <R, E, A>(self: STM<R, E, A>) => STM<R, never, boolean> = stm.isSuccess

/**
 * Iterates with the specified transactional function. The moral equivalent
 * of:
 *
 * ```ts
 * const s = initial
 *
 * while (cont(s)) {
 *   s = body(s)
 * }
 *
 * return s
 * ```
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const iterate: <Z>(initial: Z, cont: (z: Z) => boolean) => <R, E>(body: (z: Z) => STM<R, E, Z>) => STM<R, E, Z> =
  stm.iterate

/**
 * "Zooms in" on the value in the `Left` side of an `Either`, moving the
 * possibility that the value is a `Right` to the error channel.
 *
 * @macro traced
 * @since 1.0.0
 * @category getters
 */
export const left: <R, E, A, A2>(self: STM<R, E, Either.Either<A, A2>>) => STM<R, Either.Either<E, A2>, A> = stm.left

/**
 * Loops with the specified transactional function, collecting the results
 * into a list. The moral equivalent of:
 *
 * ```ts
 * const as = []
 * let s  = initial
 *
 * while (cont(s)) {
 *   as.push(body(s))
 *   s  = inc(s)
 * }
 *
 * return as
 * ```
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const loop: <Z, R, E, A>(
  initial: Z,
  cont: (z: Z) => boolean,
  inc: (z: Z) => Z,
  body: (z: Z) => STM<R, E, A>
) => STM<R, E, Chunk.Chunk<A>> = stm.loop

/**
 * Loops with the specified transactional function purely for its
 * transactional effects. The moral equivalent of:
 *
 * ```ts
 * let s = initial
 *
 * while (cont(s)) {
 *   body(s)
 *   s = inc(s)
 * }
 * ```
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const loopDiscard: <Z, R, E, X>(
  initial: Z,
  cont: (z: Z) => boolean,
  inc: (z: Z) => Z,
  body: (z: Z) => STM<R, E, X>
) => STM<R, E, void> = stm.loopDiscard

/**
 * Maps the value produced by the effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category mapping
 */
export const map: <A, B>(f: (a: A) => B) => <R, E>(self: STM<R, E, A>) => STM<R, E, B> = core.map

/**
 * Maps the value produced by the effect with the specified function that may
 * throw exceptions but is otherwise pure, translating any thrown exceptions
 * into typed failed effects.
 *
 * @macro traced
 * @since 1.0.0
 * @category mapping
 */
export const mapAttempt: <A, B>(f: (a: A) => B) => <R, E>(self: STM<R, E, A>) => STM<R, unknown, B> = stm.mapAttempt

/**
 * Returns an `STM` effect whose failure and success channels have been mapped
 * by the specified pair of functions, `f` and `g`.
 *
 * @macro traced
 * @since 1.0.0
 * @category mapping
 */
export const mapBoth: <E, E2, A, A2>(
  f: (error: E) => E2,
  g: (value: A) => A2
) => <R>(self: STM<R, E, A>) => STM<R, E2, A2> = stm.mapBoth

/**
 * Maps from one error type to another.
 *
 * @macro traced
 * @since 1.0.0
 * @category mapping
 */
export const mapError: <E, E2>(f: (error: E) => E2) => <R, A>(self: STM<R, E, A>) => STM<R, E2, A> = stm.mapError

/**
 * Returns a new effect where the error channel has been merged into the
 * success channel to their common combined type.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const merge: <R, E, A>(self: STM<R, E, A>) => STM<R, never, E | A> = stm.merge

/**
 * Merges an `Iterable<STM>` to a single `STM`, working sequentially.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const mergeAll: <A2, A>(
  zero: A2,
  f: (a2: A2, a: A) => A2
) => <R, E>(iterable: Iterable<STM<R, E, A>>) => STM<R, E, A2> = stm.mergeAll

/**
 * Returns a new effect where boolean value of this effect is negated.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const negate: <R, E>(self: STM<R, E, boolean>) => STM<R, E, boolean> = stm.negate

/**
 * Requires the option produced by this value to be `None`.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const none: <R, E, A>(self: STM<R, E, Option.Option<A>>) => STM<R, Option.Option<E>, void> = stm.none

/**
 * Converts the failure channel into an `Option`.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const option: <R, E, A>(self: STM<R, E, A>) => STM<R, never, Option.Option<A>> = stm.option

/**
 * Translates `STM` effect failure into death of the fiber, making all
 * failures unchecked and not a part of the type of the effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const orDie: <R, E, A>(self: STM<R, E, A>) => STM<R, never, A> = stm.orDie

/**
 * Keeps none of the errors, and terminates the fiber running the `STM` effect
 * with them, using the specified function to convert the `E` into a defect.
 *
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const orDieWith: <E>(f: (error: E) => unknown) => <R, A>(self: STM<R, E, A>) => STM<R, never, A> = stm.orDieWith

/**
 * Tries this effect first, and if it fails or retries, tries the other
 * effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const orElse: <R2, E2, A2>(
  that: LazyArg<STM<R2, E2, A2>>
) => <R, E, A>(self: STM<R, E, A>) => STM<R2 | R, E2, A2 | A> = stm.orElse

/**
 * Returns a transactional effect that will produce the value of this effect
 * in left side, unless it fails or retries, in which case, it will produce
 * the value of the specified effect in right side.
 *
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const orElseEither: <R2, E2, A2>(
  that: LazyArg<STM<R2, E2, A2>>
) => <R, E, A>(self: STM<R, E, A>) => STM<R2 | R, E2, Either.Either<A, A2>> = stm.orElseEither

/**
 * Tries this effect first, and if it fails or retries, fails with the
 * specified error.
 *
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const orElseFail: <E2>(error: LazyArg<E2>) => <R, E, A>(self: STM<R, E, A>) => STM<R, E2, A> = stm.orElseFail

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails with the `None` value, in which case it will produce the value of the
 * specified effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const orElseOptional: <R2, E2, A2>(
  that: LazyArg<STM<R2, Option.Option<E2>, A2>>
) => <R, E, A>(self: STM<R, Option.Option<E>, A>) => STM<R2 | R, Option.Option<E2 | E>, A2 | A> = stm.orElseOptional

/**
 * Tries this effect first, and if it fails or retries, succeeds with the
 * specified value.
 *
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const orElseSucceed: <A2>(value: LazyArg<A2>) => <R, E, A>(self: STM<R, E, A>) => STM<R, never, A2 | A> =
  stm.orElseSucceed

/**
 * Tries this effect first, and if it enters retry, then it tries the other
 * effect. This is an equivalent of Haskell's orElse.
 *
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const orTry: <R1, E1, A1>(
  that: () => STM<R1, E1, A1>
) => <R, E, A>(self: STM<R, E, A>) => STM<R1 | R, E1 | E, A1 | A> = core.orTry

/**
 * Feeds elements of type `A` to a function `f` that returns an effect.
 * Collects all successes and failures in a tupled fashion.
 *
 * @macro traced
 * @since 1.0.0
 * @category traversing
 */
export const partition: <R, E, A, A2>(
  f: (a: A) => STM<R, E, A2>
) => (elements: Iterable<A>) => STM<R, E, readonly [Chunk.Chunk<E>, Chunk.Chunk<A2>]> = stm.partition

/**
 * Provides the transaction its required environment, which eliminates its
 * dependency on `R`.
 *
 * @macro traced
 * @since 1.0.0
 * @category environment
 */
export const provideEnvironment: <R>(env: Context.Context<R>) => <E, A>(self: STM<R, E, A>) => STM<never, E, A> =
  stm.provideEnvironment

/**
 * Transforms the environment being provided to this effect with the specified
 * function.
 *
 * @macro traced
 * @since 1.0.0
 * @category environment
 */
export const provideSomeEnvironment: <R0, R>(
  f: (context: Context.Context<R0>) => Context.Context<R>
) => <E, A>(self: STM<R, E, A>) => STM<R0, E, A> = core.provideSomeEnvironment

/**
 * Folds an `Iterable<A>` using an effectual function f, working sequentially
 * from left to right.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const reduce: <S, A, R, E>(zero: S, f: (s: S, a: A) => STM<R, E, S>) => (iterable: Iterable<A>) => STM<R, E, S> =
  stm.reduce

/**
 * Reduces an `Iterable<STM>` to a single `STM`, working sequentially.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const reduceAll: <R2, E2, A>(
  initial: STM<R2, E2, A>,
  f: (x: A, y: A) => A
) => <R, E>(iterable: Iterable<STM<R, E, A>>) => STM<R2 | R, E2 | E, A> = stm.reduceAll

/**
 * Folds an `Iterable<A>` using an effectual function f, working sequentially
 * from right to left.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const reduceRight: <S, A, R, E>(
  zero: S,
  f: (s: S, a: A) => STM<R, E, S>
) => (iterable: Iterable<A>) => STM<R, E, S> = stm.reduceRight

/**
 * Keeps some of the errors, and terminates the fiber with the rest.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const refineOrDie: <E, E2>(pf: (error: E) => Option.Option<E2>) => <R, A>(self: STM<R, E, A>) => STM<R, E2, A> =
  stm.refineOrDie

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using the
 * specified function to convert the `E` into a `Throwable`.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const refineOrDieWith: <E, E2>(
  pf: (error: E) => Option.Option<E2>,
  f: (error: E) => unknown
) => <R, A>(self: STM<R, E, A>) => STM<R, E2, A> = stm.refineOrDieWith

/**
 * Fail with the returned value if the `PartialFunction` matches, otherwise
 * continue with our held value.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const reject: <A, E2>(pf: (a: A) => Option.Option<E2>) => <R, E>(self: STM<R, E, A>) => STM<R, E2 | E, A> =
  stm.reject

/**
 * Continue with the returned computation if the specified partial function
 * matches, translating the successful match into a failure, otherwise continue
 * with our held value.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const rejectSTM: <A, R2, E2>(
  pf: (a: A) => Option.Option<STM<R2, E2, E2>>
) => <R, E>(self: STM<R, E, A>) => STM<R2 | R, E2 | E, A> = stm.rejectSTM

/**
 * Repeats this `STM` effect until its result satisfies the specified
 * predicate.
 *
 * **WARNING**: `repeatUntil` uses a busy loop to repeat the effect and will
 * consume a thread until it completes (it cannot yield). This is because STM
 * describes a single atomic transaction which must either complete, retry or
 * fail a transaction before yielding back to the Effect runtime.
 *   - Use `retryUntil` instead if you don't need to maintain transaction
 *     state for repeats.
 *   - Ensure repeating the STM effect will eventually satisfy the predicate.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const repeatUntil: <A>(predicate: Predicate<A>) => <R, E>(self: STM<R, E, A>) => STM<R, E, A> = stm.repeatUntil

/**
 * Repeats this `STM` effect while its result satisfies the specified
 * predicate.
 *
 * **WARNING**: `repeatWhile` uses a busy loop to repeat the effect and will
 * consume a thread until it completes (it cannot yield). This is because STM
 * describes a single atomic transaction which must either complete, retry or
 * fail a transaction before yielding back to the Effect runtime.
 *   - Use `retryWhile` instead if you don't need to maintain transaction
 *     state for repeats.
 *   - Ensure repeating the STM effect will eventually not satisfy the
 *     predicate.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const repeatWhile: <A>(predicate: Predicate<A>) => <R, E>(self: STM<R, E, A>) => STM<R, E, A> = stm.repeatWhile

/**
 * Replicates the given effect n times. If 0 or negative numbers are given, an
 * empty `Chunk` will be returned.
 *
 * @since 1.0.0
 * @category constructors
 */
export const replicate: (n: number) => <R, E, A>(self: STM<R, E, A>) => Chunk.Chunk<STM<R, E, A>> = stm.replicate

/**
 * Performs this transaction the specified number of times and collects the
 * results.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const replicateSTM: (n: number) => <R, E, A>(self: STM<R, E, A>) => STM<R, E, Chunk.Chunk<A>> = stm.replicateSTM

/**
 * Performs this transaction the specified number of times, discarding the
 * results.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const replicateSTMDiscard: (n: number) => <R, E, A>(self: STM<R, E, A>) => STM<R, E, void> =
  stm.replicateSTMDiscard

/**
 * Abort and retry the whole transaction when any of the underlying
 * transactional variables have changed.
 *
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const retry: () => STM<never, never, never> = core.retry

/**
 * Filters the value produced by this effect, retrying the transaction until
 * the predicate returns `true` for the value.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const retryUntil: <A>(predicate: Predicate<A>) => <R, E>(self: STM<R, E, A>) => STM<R, E, A> = stm.retryUntil

/**
 * Filters the value produced by this effect, retrying the transaction while
 * the predicate returns `true` for the value.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const retryWhile: <A>(predicate: Predicate<A>) => <R, E>(self: STM<R, E, A>) => STM<R, E, A> = stm.retryWhile

/**
 * "Zooms in" on the value in the `Right` side of an `Either`, moving the
 * possibility that the value is a `Left` to the error channel.
 *
 * @macro traced
 * @since 1.0.0
 * @category getters
 */
export const right: <R, E, A, A2>(self: STM<R, E, Either.Either<A, A2>>) => STM<R, Either.Either<A, E>, A2> = stm.right

/**
 * Accesses the specified service in the environment of the effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const service: <T>(tag: Context.Tag<T>) => STM<T, never, T> = stm.service

/**
 * Effectfully accesses the specified service in the environment of the
 * effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const serviceWith: <T>(tag: Context.Tag<T>) => <A>(f: (service: T) => A) => STM<T, never, A> = stm.serviceWith

/**
 * Effectfully accesses the specified service in the environment of the
 * effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const serviceWithSTM: <T>(
  tag: Context.Tag<T>
) => <R, E, A>(f: (service: T) => STM<R, E, A>) => STM<T | R, E, A> = stm.serviceWithSTM

/**
 * Converts an option on values into an option on errors.
 *
 * @macro traced
 * @since 1.0.0
 * @category getters
 */
export const some: <R, E, A>(self: STM<R, E, Option.Option<A>>) => STM<R, Option.Option<E>, A> = stm.some

/**
 * Extracts the optional value, or returns the given 'default'.
 *
 * @macro traced
 * @since 1.0.0
 * @category getters
 */
export const someOrElse: <A2>(
  orElse: LazyArg<A2>
) => <R, E, A>(self: STM<R, E, Option.Option<A>>) => STM<R, E, A2 | A> = stm.someOrElse

/**
 * Extracts the optional value, or executes the effect 'default'.
 *
 * @macro traced
 * @since 1.0.0
 * @category getters
 */
export const someOrElseSTM: <R2, E2, A2>(
  orElse: LazyArg<STM<R2, E2, A2>>
) => <R, E, A>(self: STM<R, E, Option.Option<A>>) => STM<R2 | R, E2 | E, A2 | A> = stm.someOrElseSTM

/**
 * Extracts the optional value, or fails with the given error 'e'.
 *
 * @macro traced
 * @since 1.0.0
 * @category getters
 */
export const someOrFail: <E2>(error: LazyArg<E2>) => <R, E, A>(self: STM<R, E, Option.Option<A>>) => STM<R, E2 | E, A> =
  stm.someOrFail

/**
 * Extracts the optional value, or fails with a
 * `Cause.NoSuchElementException`.
 *
 * @macro traced
 * @since 1.0.0
 * @category getters
 */
export const someOrFailException: <R, E, A>(
  self: STM<R, E, Option.Option<A>>
) => STM<R, E | Cause.NoSuchElementException, A> = stm.someOrFailException

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const struct: <NER extends Record<string, STM<any, any, any>>>(
  r: EnforceNonEmptyRecord<NER> | Record<string, STM<any, any, any>>
) => STM<
  [NER[keyof NER]] extends [{ [STMTypeId]: { _R: (_: never) => infer R } }] ? R : never,
  [NER[keyof NER]] extends [{ [STMTypeId]: { _E: (_: never) => infer E } }] ? E : never,
  {
    [K in keyof NER]: [NER[K]] extends [{ [STMTypeId]: { _A: (_: never) => infer A } }] ? A : never
  }
> = stm.struct

/**
 * Returns an `STM` effect that succeeds with the specified value.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const succeed: <A>(value: A) => STM<never, never, A> = core.succeed

/**
 * Returns an effect with the value on the left part.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const succeedLeft: <A>(value: A) => STM<never, never, Either.Either<A, never>> = stm.succeedLeft

/**
 * Returns an effect with the empty value.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const succeedNone: () => STM<never, never, Option.Option<never>> = stm.succeedNone

/**
 * Returns an effect with the value on the right part.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const succeedRight: <A>(value: A) => STM<never, never, Either.Either<never, A>> = stm.succeedRight

/**
 * Returns an effect with the optional value.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const succeedSome: <A>(value: A) => STM<never, never, Option.Option<A>> = stm.succeedSome

/**
 * Summarizes a `STM` effect by computing a provided value before and after
 * execution, and then combining the values to produce a summary, together
 * with the result of execution.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const summarized: <R2, E2, A2, A3>(
  summary: STM<R2, E2, A2>,
  f: (before: A2, after: A2) => A3
) => <R, E, A>(self: STM<R, E, A>) => STM<R2 | R, E2 | E, readonly [A3, A]> = stm.summarized

/**
 * Suspends creation of the specified transaction lazily.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const suspend: <R, E, A>(evaluate: LazyArg<STM<R, E, A>>) => STM<R, E, A> = stm.suspend

/**
 * Returns an `STM` effect that succeeds with the specified lazily evaluated
 * value.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const sync: <A>(evaluate: () => A) => STM<never, never, A> = core.sync

/**
 * "Peeks" at the success of transactional effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category sequencing
 */
export const tap: <A, R2, E2, _>(f: (a: A) => STM<R2, E2, _>) => <R, E>(self: STM<R, E, A>) => STM<R2 | R, E2 | E, A> =
  stm.tap

/**
 * "Peeks" at both sides of an transactional effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category sequencing
 */
export const tapBoth: <E, R2, E2, A2, A, R3, E3, A3>(
  f: (error: E) => STM<R2, E2, A2>,
  g: (value: A) => STM<R3, E3, A3>
) => <R>(self: STM<R, E, A>) => STM<R2 | R3 | R, E | E2 | E3, A> = stm.tapBoth

/**
 * "Peeks" at the error of the transactional effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category sequencing
 */
export const tapError: <E, R2, E2, _>(
  f: (error: E) => STM<R2, E2, _>
) => <R, A>(self: STM<R, E, A>) => STM<R2 | R, E | E2, A> = stm.tapError

/**
 * Imports a synchronous side-effect into a pure value, translating any thrown
 * exceptions into typed failed effects.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const tryCatch: <E, A>(attempt: () => A, onThrow: (u: unknown) => E) => Effect.Effect<never, E, A> = stm.tryCatch

/**
 * Like `forEach` + `identity` with a tuple type.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const tuple: <T extends NonEmptyArraySTM>(
  ...t: T
) => STM<
  [T[number]] extends [{ [STMTypeId]: { _R: (_: never) => infer R } }] ? R : never,
  [T[number]] extends [{ [STMTypeId]: { _E: (_: never) => infer E } }] ? E : never,
  TupleSTM<T>
> = stm.tuple

/**
 * Converts a `STM<R, Either<E, A>, A2>` into a `STM<R, E, Either<A2, A>>`.
 * The inverse of `left`.
 *
 * @macro traced
 * @since 1.0.0
 * @category getters
 */
export const unleft: <R, E, A, A2>(self: STM<R, Either.Either<E, A>, A2>) => STM<R, E, Either.Either<A2, A>> =
  stm.unleft

/**
 * The moral equivalent of `if (!p) exp`
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const unless: (predicate: LazyArg<boolean>) => <R, E, A>(self: STM<R, E, A>) => STM<R, E, Option.Option<A>> =
  stm.unless

/**
 * The moral equivalent of `if (!p) exp` when `p` has side-effects
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const unlessSTM: <R2, E2>(
  predicate: STM<R2, E2, boolean>
) => <R, E, A>(self: STM<R, E, A>) => STM<R2 | R, E2 | E, Option.Option<A>> = stm.unlessSTM

/**
 * Converts a `STM<R, Either<A, E>, A2>` into a `STM<R, E, Either<A, A2>>`.
 * The inverse of `right`.
 *
 * @macro traced
 * @since 1.0.0
 * @category getters
 */
export const unright: <R, E, A, A2>(self: STM<R, Either.Either<A, E>, A2>) => STM<R, E, Either.Either<A, A2>> =
  stm.unright

/**
 * Converts an option on errors into an option on values.
 *
 * @macro traced
 * @since 1.0.0
 * @category getters
 */
export const unsome: <R, E, A>(self: STM<R, Option.Option<E>, A>) => STM<R, E, Option.Option<A>> = stm.unsome

/**
 * Sequentially zips this value with the specified one.
 *
 * @macro traced
 * @since 1.0.0
 * @category zipping
 */
export const zip: <R1, E1, A1>(
  that: STM<R1, E1, A1>
) => <R, E, A>(self: STM<R, E, A>) => STM<R1 | R, E1 | E, readonly [A, A1]> = core.zip

/**
 * Sequentially zips this value with the specified one, discarding the second
 * element of the tuple.
 *
 * @macro traced
 * @since 1.0.0
 * @category zipping
 */
export const zipLeft: <R1, E1, A1>(
  that: STM<R1, E1, A1>
) => <R, E, A>(self: STM<R, E, A>) => STM<R1 | R, E1 | E, A> = core.zipLeft

/**
 * Sequentially zips this value with the specified one, discarding the first
 * element of the tuple.
 *
 * @macro traced
 * @since 1.0.0
 * @category zipping
 */
export const zipRight: <R1, E1, A1>(
  that: STM<R1, E1, A1>
) => <R, E, A>(self: STM<R, E, A>) => STM<R1 | R, E1 | E, A1> = core.zipRight

/**
 * Sequentially zips this value with the specified one, combining the values
 * using the specified combiner function.
 *
 * @macro traced
 * @since 1.0.0
 * @category zipping
 */
export const zipWith: <R1, E1, A1, A, A2>(
  that: STM<R1, E1, A1>,
  f: (a: A, b: A1) => A2
) => <R, E>(self: STM<R, E, A>) => STM<R1 | R, E1 | E, A2> = core.zipWith

/**
 * Returns an `STM` effect that succeeds with `Unit`.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const unit: () => STM<never, never, void> = stm.unit

/**
 * Feeds elements of type `A` to `f` and accumulates all errors in error
 * channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost. To retain all information please use `STM.partition`.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const validateAll: <R, E, A, B>(
  f: (a: A) => STM<R, E, B>
) => (elements: Iterable<A>) => STM<R, Chunk.NonEmptyChunk<E>, Chunk.Chunk<B>> = stm.validateAll

/**
 * Feeds elements of type `A` to `f` until it succeeds. Returns first success
 * or the accumulation of all errors.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const validateFirst: <R, E, A, B>(
  f: (a: A) => STM<R, E, B>
) => (elements: Iterable<A>) => STM<R, Chunk.Chunk<E>, B> = stm.validateFirst

/**
 * The moral equivalent of `if (p) exp`.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const when: (predicate: LazyArg<boolean>) => <R, E, A>(self: STM<R, E, A>) => STM<R, E, Option.Option<A>> =
  stm.when

/**
 * Runs an effect when the supplied partial function matches for the given
 * value, otherwise does nothing.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const whenCase: <R, E, A, B>(
  evaluate: () => A,
  pf: (a: A) => Option.Option<STM<R, E, B>>
) => STM<R, E, Option.Option<B>> = stm.whenCase

/**
 * Runs an effect when the supplied partial function matches for the given
 * effectful value, otherwise does nothing.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const whenCaseSTM: <A, R2, E2, A2>(
  pf: (a: A) => Option.Option<STM<R2, E2, A2>>
) => <R, E>(self: STM<R, E, A>) => STM<R2 | R, E2 | E, Option.Option<A2>> = stm.whenCaseSTM

/**
 * The moral equivalent of `if (p) exp` when `p` has side-effects.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const whenSTM: <R2, E2>(
  predicate: STM<R2, E2, boolean>
) => <R, E, A>(self: STM<R, E, A>) => STM<R2 | R, E2 | E, Option.Option<A>> = stm.whenSTM
