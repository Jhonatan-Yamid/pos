"use client";

import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { useCrud } from "@/hooks/useCrud";
import ProductItem from "@/components/ProductItem";
import { Button, PageContainer, PageHeader, SearchInput, EmptyState } from "@/components/ui";

export default function ProductListPage() {
  const router = useRouter();
  const { slug } = useParams();

  const {
    filteredItems: products,
    searchTerm,
    setSearchTerm,
    remove,
  } = useCrud({ endpoint: `/api/${slug}/products`, searchFields: ["name"] });

  const handleDelete = async (id) => {
    if (!confirm("¿Seguro que deseas eliminar este producto?")) return;
    await remove(id);
  };

  const handleEdit = (product) =>
    router.push(`/${slug}/dashboard/products/${product.id}/edit`);

  return (
    <PageContainer>
      <PageHeader
        title="Productos"
        action={
          <Button onClick={() => router.push(`/${slug}/dashboard/products/new`)}>
            Nuevo Producto
          </Button>
        }
      />

      <SearchInput
        placeholder="Buscar producto por nombre..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-8"
      />

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {products.map((product) => (
          <ProductItem
            key={product.id}
            product={product}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
        {products.length === 0 && (
          <EmptyState message="No se encontraron productos." />
        )}
      </div>
    </PageContainer>
  );
}
