import { JSONSchema7 } from "json-schema";
import { BadRequestError, NotFoundError } from "kuzzle";
import isEqual from "lodash/isEqual";
export interface RecipientTypeLocale {
  label: string;
  description?: string;
}

/** Well-known audience: the recipient designates a person. */
export const RECIPIENT_AUDIENCE_HUMAN = "human";
/** Well-known audience: the recipient designates a technical resource. */
export const RECIPIENT_AUDIENCE_TECHNICAL = "technical";

export interface RecipientTypeDefinition {
  /** Unique registry key, e.g. 'email', 'phoneNumber', 'uri', 'pushToken'. */
  name: string;
  /** Fallback/default human description. */
  description: string;
  /**
   * Audiences a recipient of this type is meant for. Free strings, at least
   * one. Two values are well-known: `"human"` (an email address, a phone
   * number, a push token...) and `"technical"` (a webhook URI, a message
   * broker topic, a bucket...). A type may belong to several audiences.
   *
   * Applications use it to decide which recipient types can be attached to a
   * user and which ones are reserved to integrations.
   */
  audiences: string[];
  /** JSON Schema describing ONE recipient string of this type (e.g. `{ type: "string", format: "email" }`). */
  jsonSchema: JSONSchema7;
}

/**
 * Criteria accepted by the recipient type, provider and account listings.
 */
export interface RecipientTypeFilter {
  /**
   * Keep only recipient types whose `audiences` include this value, or at
   * least one of these values when an array is given. An empty array is the
   * same as no filter.
   */
  audience?: string | string[];
}

/**
 * Normalize the `audience` criterion of a filter to an array.
 *
 * @returns the requested audiences, empty when the filter does not restrict
 *   the audience
 */
export function getFilteredAudiences(
  filter: RecipientTypeFilter = {},
): string[] {
  if (filter.audience === undefined) {
    return [];
  }

  return Array.isArray(filter.audience) ? filter.audience : [filter.audience];
}

/**
 * Whether a recipient type definition satisfies a filter.
 */
export function matchesRecipientTypeFilter(
  definition: RecipientTypeDefinition,
  filter: RecipientTypeFilter = {},
): boolean {
  const audiences = getFilteredAudiences(filter);

  if (audiences.length === 0) {
    return true;
  }

  return definition.audiences.some((audience) => audiences.includes(audience));
}

export class RecipientTypeRegistry {
  private definitions = new Map<string, RecipientTypeDefinition>();

  register(definition: RecipientTypeDefinition): void {
    if (
      !Array.isArray(definition.audiences) ||
      definition.audiences.length === 0 ||
      definition.audiences.some((a) => typeof a !== "string" || a.length === 0)
    ) {
      throw new BadRequestError(
        `Recipient type "${definition.name}" must declare "audiences" as a non-empty array of non-empty strings.`,
      );
    }

    const existing = this.definitions.get(definition.name);

    if (existing) {
      const isIdentical = isEqual(existing, definition);

      if (isIdentical) {
        return;
      }

      throw new BadRequestError(
        `Recipient type "${definition.name}" is already registered with a different definition.`,
      );
    }

    this.definitions.set(definition.name, definition);
  }

  has(name: string): boolean {
    return this.definitions.has(name);
  }

  get(name: string): RecipientTypeDefinition {
    const definition = this.definitions.get(name);

    if (!definition) {
      throw new NotFoundError(`Recipient type "${name}" is not registered.`);
    }

    return definition;
  }

  /**
   * List registered recipient types, optionally restricted to one or several
   * audiences.
   */
  list(filter: RecipientTypeFilter = {}): RecipientTypeDefinition[] {
    return Array.from(this.definitions.values()).filter((definition) =>
      matchesRecipientTypeFilter(definition, filter),
    );
  }
}
