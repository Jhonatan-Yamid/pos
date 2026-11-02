"use client";

import SalesForm from "../page";

export default function EditSalePage({ params }) {
  return <SalesForm saleId={params.id} />;
}
