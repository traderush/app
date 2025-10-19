import { ProductTypeHooks, NullProductType } from './product';
import { ProductTypeId } from './types';

export class ProductRegistry {
  private readonly productTypes = new Map<ProductTypeId, ProductTypeHooks>();

  constructor() {
    this.register(new NullProductType());
  }

  register(hooks: ProductTypeHooks): void {
    if (this.productTypes.has(hooks.id)) {
      throw new Error(`Product type ${hooks.id} is already registered`);
    }
    this.productTypes.set(hooks.id, hooks);
    hooks.init?.();
  }

  get(productTypeId: ProductTypeId): ProductTypeHooks {
    const hooks = this.productTypes.get(productTypeId);
    if (!hooks) {
      throw new Error(`Unknown product type: ${productTypeId}`);
    }
    return hooks;
  }

  has(productTypeId: ProductTypeId): boolean {
    return this.productTypes.has(productTypeId);
  }

  list(): ProductTypeHooks[] {
    return Array.from(this.productTypes.values());
  }
}
