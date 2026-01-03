/**
 * src/domain/result.ts
 * Lightweight Result pattern for domain code.
 *
 * V1 rule: domain functions must be pure and must not throw exceptions.
 */

import { ErrorCode } from '@/domain/enums';

/**
 * Optional structured details attached to a DomainError.
 *
 * @remarks
 * Keep details JSON-serializable and safe to log; UI may surface selected fields.
 */
export type DomainErrorDetails = Readonly<Record<string, unknown>>;

/**
 * Standard domain error shape used across V1.
 *
 * @remarks
 * Domain code must not throw; callers are expected to handle errors via Result.
 */
export type DomainError = Readonly<{
    code: ErrorCode;
    details?: DomainErrorDetails;
}>;

/**
 * Successful Result container.
 */
export type Ok<T> = Readonly<{ ok: true; value: T }>;

/**
 * Failed Result container.
 */
export type Err<E> = Readonly<{ ok: false; error: E }>;

/**
 * Discriminated union representing success or failure.
 */
export type Result<T, E> = Ok<T> | Err<E>;

/**
 * Constructs an Ok result.
 *
 * @param value - Successful value to wrap.
 */
export function ok<T>(value: T): Ok<T> {
    return { ok: true, value };
}

/**
 * Constructs an Err result.
 *
 * @param error - Error value to wrap.
 */
export function err<E>(error: E): Err<E> {
    return { ok: false, error };
}

/**
 * Maps a Result's successful value.
 *
 * @param result - Input Result.
 * @param fn - Mapping function applied only when ok=true.
 * @returns A Result containing the mapped value, or the original error.
 */
export function mapResult<T, E, U>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
    return result.ok ? ok(fn(result.value)) : result;
}

/**
 * Chains Result-producing operations.
 *
 * @param result - Input Result.
 * @param fn - Function applied only when ok=true.
 * @returns The next Result, or the original error.
 */
export function andThen<T, E, U>(
    result: Result<T, E>,
    fn: (value: T) => Result<U, E>
): Result<U, E> {
    return result.ok ? fn(result.value) : result;
}
