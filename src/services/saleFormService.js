import { apiGet } from '@/libs/apiClient';

export async function fetchAvailableProducts(slug) {
  return apiGet(`/api/${slug}/product`);
}

export async function fetchAvailableGames(slug) {
  return apiGet(`/api/${slug}/game`);
}

export async function fetchAvailableAdditions(slug) {
  return apiGet(`/api/${slug}/product?category=adiciones`);
}

export async function fetchSaleById(slug, saleId) {
  const numericId = Number(saleId);
  if (Number.isNaN(numericId)) {
    throw new Error('ID de venta inválido');
  }
  return apiGet(`/api/${slug}/sale/${numericId}`);
}

export function mapSaleApiProductToFormProduct(product) {
  return {
    ...product,
    additions: (product.additions || []).map((a) => ({
      id: a.id || a.name,
      name: a.name,
      price: a.price,
    })),
    observation: product.observation || '',
    quantity: product.quantity || 1,
  };
}

export function mapSaleDataToFormState(saleData) {
  return {
    products: Array.isArray(saleData.products)
      ? saleData.products.map(mapSaleApiProductToFormProduct)
      : [],
    tableNumber: saleData.table?.toString() || '',
    saleStatus: saleData.status || 'en proceso',
    generalObservation: saleData.generalObservation || '',
    game: saleData.gameId?.toString() || '',
    orderType: saleData.orderType || 'En mesa',
  };
}
