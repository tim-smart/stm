---
title: TSemaphore.ts
nav_order: 4
parent: Modules
---

## TSemaphore overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [make](#make)
- [getters](#getters)
  - [available](#available)
- [models](#models)
  - [TSemaphore (interface)](#tsemaphore-interface)
- [mutations](#mutations)
  - [acquire](#acquire)
  - [acquireN](#acquiren)
  - [release](#release)
  - [releaseN](#releasen)
  - [withPermit](#withpermit)
  - [withPermitScoped](#withpermitscoped)
  - [withPermits](#withpermits)
  - [withPermitsScoped](#withpermitsscoped)
- [symbols](#symbols)
  - [TSemaphoreTypeId](#tsemaphoretypeid)
  - [TSemaphoreTypeId (type alias)](#tsemaphoretypeid-type-alias)
- [unsafe](#unsafe)
  - [unsafeMake](#unsafemake)

---

# constructors

## make

**Signature**

```ts
export declare const make: (permits: number) => STM.STM<never, never, TSemaphore>
```

Added in v1.0.0

# getters

## available

**Signature**

```ts
export declare const available: (self: TSemaphore) => STM.STM<never, never, number>
```

Added in v1.0.0

# models

## TSemaphore (interface)

**Signature**

```ts
export interface TSemaphore {
  readonly [TSemaphoreTypeId]: TSemaphoreTypeId
  /** @internal */
  readonly permits: TRef.TRef<number>
}
```

Added in v1.0.0

# mutations

## acquire

**Signature**

```ts
export declare const acquire: (self: TSemaphore) => STM.STM<never, never, void>
```

Added in v1.0.0

## acquireN

**Signature**

```ts
export declare const acquireN: (n: number) => (self: TSemaphore) => STM.STM<never, never, void>
```

Added in v1.0.0

## release

**Signature**

```ts
export declare const release: (self: TSemaphore) => STM.STM<never, never, void>
```

Added in v1.0.0

## releaseN

**Signature**

```ts
export declare const releaseN: (n: number) => (self: TSemaphore) => STM.STM<never, never, void>
```

Added in v1.0.0

## withPermit

**Signature**

```ts
export declare const withPermit: (
  semaphore: TSemaphore
) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
```

Added in v1.0.0

## withPermitScoped

**Signature**

```ts
export declare const withPermitScoped: (self: TSemaphore) => Effect.Effect<Scope.Scope, never, void>
```

Added in v1.0.0

## withPermits

**Signature**

```ts
export declare const withPermits: (
  permits: number
) => (semaphore: TSemaphore) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
```

Added in v1.0.0

## withPermitsScoped

**Signature**

```ts
export declare const withPermitsScoped: (
  permits: number
) => (self: TSemaphore) => Effect.Effect<Scope.Scope, never, void>
```

Added in v1.0.0

# symbols

## TSemaphoreTypeId

**Signature**

```ts
export declare const TSemaphoreTypeId: typeof TSemaphoreTypeId
```

Added in v1.0.0

## TSemaphoreTypeId (type alias)

**Signature**

```ts
export type TSemaphoreTypeId = typeof TSemaphoreTypeId
```

Added in v1.0.0

# unsafe

## unsafeMake

**Signature**

```ts
export declare const unsafeMake: (permits: number) => TSemaphore
```

Added in v1.0.0
