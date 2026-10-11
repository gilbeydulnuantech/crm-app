import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/products';
import { Product } from '../api/products';

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: api.fetchProducts,
  });
}

export function useSaveProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.saveProduct,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteProduct(id),
    onSuccess: (_data, id) => {
      qc.setQueriesData<Product[]>({ queryKey: ['products'] }, (old) => old?.filter((p) => p.id !== id));
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
