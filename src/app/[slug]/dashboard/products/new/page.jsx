"use client";

import { useRouter, useParams } from "next/navigation";
import ProductForm from "@/components/ProductForm";
import { apiPost } from "@/libs/apiClient";
import { PageContainer } from "@/components/ui";

export default function NewProductPage() {
  const router = useRouter();
  const { slug } = useParams();

  const handleSubmit = async (formData) => {
    await apiPost(`/api/${slug}/products`, formData);
    router.push(`/${slug}/dashboard/products`);
  };

  return (
    <PageContainer>
      <ProductForm onSubmit={handleSubmit} isNewProduct slug={slug} />
    </PageContainer>
  );
}
