import { InternalError, JSONObject, PluginContext } from "kuzzle";
import { BaseProvider } from "./BaseProvider";
import { matches } from "lodash";
import { ProviderCapabilities } from "../types";

export class ProviderManager {
  readonly providers = new Map<string, BaseProvider<any>>();

  async init(config: JSONObject, context: PluginContext): Promise<void> {
    for (const [, value] of this.providers) {
      await value.init(config, context);
    }
  }

  set(providerName: string, providerInstance: BaseProvider<any>) {
    this.providers.set(providerName, providerInstance);
  }

  has(providerName: string): boolean {
    return this.providers.has(providerName);
  }

  get(providerName: string): BaseProvider<any> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new InternalError(
        `${providerName} provider is not available yet. Are you trying to access it before the application has started ?`,
      );
    }

    return provider;
  }

  listProviders(filter?: Partial<ProviderCapabilities>): BaseProvider<any>[] {
    let providers = Array.from(this.providers.values());

    if (filter && Object.keys(filter).length > 0) {
      const filterMatcher = matches(filter);
      providers = providers.filter((p) => filterMatcher(p.capabilities));
    }

    return providers;
  }
}
