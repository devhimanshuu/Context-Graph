/**
 * The common mapper contract.
 *
 * Mappers convert between representations (domain → DTO, DTO → event payload,
 * wire → domain). They are pure and synchronous; async enrichment belongs in
 * services, not mappers. Concrete mappers land with the feature
 * implementations and are bound in the DI container.
 */
export interface Mapper<TSource, TTarget> {
  map(source: TSource): TTarget
}
