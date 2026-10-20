export interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  brand: string;
  description: string;
  slug: string;
  manual: string;
  images: string[];
};

export interface ProductGroup {
    name: string;
    slug: string;
    description: string;
    products: Product[];
};
