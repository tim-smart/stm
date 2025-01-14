import type * as Exit from "@effect/io/Exit"
import * as OpCodes from "@effect/stm/internal/opCodes/tryCommit"
import type * as Journal from "@effect/stm/internal/stm/journal"

/** @internal */
export type TryCommit<E, A> = Done<E, A> | Suspend

/** @internal */
export interface Done<E, A> {
  readonly op: OpCodes.OP_DONE
  readonly exit: Exit.Exit<E, A>
}

/** @internal */
export interface Suspend {
  readonly op: OpCodes.OP_SUSPEND
  readonly journal: Journal.Journal
}

/** @internal */
export const done = <E, A>(exit: Exit.Exit<E, A>): TryCommit<E, A> => {
  return {
    op: OpCodes.OP_DONE,
    exit
  }
}

/** @internal */
export const suspend = (journal: Journal.Journal): TryCommit<never, never> => {
  return {
    op: OpCodes.OP_SUSPEND,
    journal
  }
}
