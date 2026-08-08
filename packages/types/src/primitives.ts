/* ContextGraph — domain primitives. Shared identity and time representations. Kept intentionally thin: the */

/* Identifier of any domain entity. UUIDs everywhere (v4). */
export type EntityId = string;

/** RFC 3339 / ISO-8601 timestamp serialized as a string (UTC). */
export type Timestamp = string;

/** A duration in milliseconds. */
export type Milliseconds = number;

/** 0-100 integer score used by importance / derivability. */
export type Score = number;

/** Arbitrary key-value metadata attached to domain entities. */
export type Metadata = Record<string, unknown>;
