import { JSONSchema7 } from "json-schema";
import { BadRequestError, NotFoundError } from "kuzzle";
import isEqual from "lodash/isEqual";
export interface RecipientTypeLocale {
  label: string;
  description?: string;
}

export interface RecipientTypeDefinition {
  /** Unique registry key, e.g. 'email', 'phoneNumber', 'pushToken', 'webhookUrl'. */
  name: string;
  /** Coarse category — multiple `name`s may share the same `type` (e.g. future 'workEmail' and 'personalEmail' could both be type 'email'). */
  type: string;
  /** Fallback/default human description. */
  description: string;
  /** JSON Schema describing the shape of ONE recipient entry for this type. */
  jsonSchema: JSONSchema7;
}

export class RecipientTypeRegistry {
  private definitions = new Map<string, RecipientTypeDefinition>();

  register(definition: RecipientTypeDefinition): void {
    const existing = this.definitions.get(definition.name);

    if (existing) {
      const isIdentical = isEqual(existing, definition);

      if (isIdentical) {
        return;
      }

      throw new BadRequestError(
        `Recipient type "${definition.name}" is already registered with a different type/jsonSchema.`,
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

  list(): RecipientTypeDefinition[] {
    return Array.from(this.definitions.values());
  }
}
