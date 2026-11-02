export function normalizeSalePayload(payload) {
  return {
    tableNumber: payload?.tableNumber ?? null,
    saleStatus: payload?.saleStatus ?? null,
    generalObservation: payload?.generalObservation ?? null,
    totalAmount: payload?.totalAmount !== undefined ? Number(payload.totalAmount) : NaN,
    products: Array.isArray(payload?.products) ? payload.products : [],
    game: payload?.game ?? null,
    orderType: payload?.orderType ?? null,
  };
}

export function validateSalePayload(payload) {
  if (!Array.isArray(payload.products) || payload.products.length === 0) {
    return 'Debe seleccionar al menos un producto';
  }

  for (const p of payload.products) {
    if (typeof p.id !== 'number' && typeof p.id !== 'string') {
      return 'Cada producto debe tener un id válido';
    }
    if (typeof p.quantity !== 'number' && typeof p.quantity !== 'string') {
      return 'Cada producto debe tener una quantity válida';
    }
  }

  if (payload.businessType !== 'fruver') {
    if (!payload.tableNumber || String(payload.tableNumber).trim() === '') {
      return 'Debes ingresar un número de mesa';
    }
  }

  if (!Number.isFinite(payload.totalAmount)) {
    return 'El total de la venta debe ser un número válido.';
  }

  return null;
}

export function buildSaleRequestPayload({
  businessType,
  products,
  tableNumber,
  saleStatus,
  generalObservation,
  totalAmount,
  game,
  orderType,
}) {
  const normalizedProducts = Array.isArray(products)
    ? products.map((p) => ({
        id: p.id,
        quantity: Number(p.quantity || 1),
        observation:
          p.observation === '' || p.observation === undefined
            ? null
            : p.observation,
        additions:
          Array.isArray(p.additions) && p.additions.length > 0
            ? p.additions.map((a) => ({
                id: a.id ?? a.name,
                name: a.name,
                price: Number(a.price) || 0,
              }))
            : [],
      }))
    : [];

  return {
    businessType,
    tableNumber: businessType === 'fruver' ? 'Mostrador' : tableNumber,
    saleStatus,
    generalObservation,
    totalAmount,
    game: businessType === 'fruver' ? null : game,
    orderType,
    products: normalizedProducts,
  };
}

export function calculateTotal(products) {
  return Array.isArray(products)
    ? products.reduce((total, p) => {
        const price = Number(p.price) || 0;
        const additionsTotal = (Array.isArray(p.additions) ? p.additions : []).reduce(
          (sum, a) => sum + (Number(a.price) || 0),
          0
        );
        const quantity = Number(p.quantity) || 1;
        return total + (price + additionsTotal) * quantity;
      }, 0)
    : 0;
}

function formatCLP(value) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function groupAndSortProducts(products, availableProducts = []) {
  const grouped = [];

  for (const p of products) {
    const template = availableProducts.find((ap) => ap.id === p.id);
    const price = p.price ?? template?.price ?? 0;
    const category = p.category ?? template?.category ?? 'Otros';

    const additionsKey = JSON.stringify(
      (p.additions || []).map((a) => a.name).sort()
    );
    const key = `${p.id}||${p.observation || ''}||${additionsKey}`;

    const existing = grouped.find((g) => g._key === key);
    if (existing) {
      existing.quantity += Number(p.quantity || 1);
    } else {
      grouped.push({
        _key: key,
        id: p.id,
        name: p.name,
        price,
        category,
        observation: p.observation || '',
        additions: p.additions || [],
        quantity: Number(p.quantity || 1),
      });
    }
  }

  const order = ['Fruver', 'Mercado', 'Fijos', 'Otros'];
  grouped.sort((a, b) => {
    const ai = order.indexOf(a.category);
    const bi = order.indexOf(b.category);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  return grouped;
}

const CATEGORY_LABEL = {
  Fruver: 'FRUVER',
  Mercado: 'MERCADO',
  Fijos: 'FIJOS',
  Otros: 'OTROS',
};

export function formatTicketText({
  products,
  total,
  tableNumber,
  orderType,
  generalObservation,
  game,
  availableGames = [],
  availableProducts = [],
  appName = process.env.NEXT_PUBLIC_APP_NAME || 'POS',
  date = new Date(),
}) {
  const sep = '─────────────────────────────────';
  let ticket = `    ${appName}\n`;
  ticket += `${sep}\n`;
  ticket += `Fecha: ${date.toLocaleDateString('es-CO')}  ${date.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  })}\n`;
  ticket += `Mesa: ${tableNumber || '-'}\n`;

  const gameName = availableGames.find((g) => g.id?.toString() === game?.toString())?.name;
  if (gameName) ticket += `Juego: ${gameName}\n`;
  ticket += `Tipo: ${orderType}\n`;
  ticket += `${sep}\n`;

  const grouped = groupAndSortProducts(products, availableProducts);
  let currentCategory = null;

  for (const item of grouped) {
    if (item.category !== currentCategory) {
      if (currentCategory !== null) ticket += '\n';
      currentCategory = item.category;
      const label = CATEGORY_LABEL[item.category] || item.category.toUpperCase();
      ticket += `  ▸ ${label}\n`;
    }

    const additionsTotal = (item.additions || []).reduce(
      (s, a) => s + (Number(a.price) || 0),
      0
    );
    const unitPrice = item.price + additionsTotal;
    const lineTotal = unitPrice * item.quantity;

    ticket += `  ${item.quantity}x ${item.name}\n`;
    ticket += `     ${formatCLP(unitPrice)} c/u  →  ${formatCLP(lineTotal)}\n`;

    if (item.observation) {
      ticket += `     ⚠ ${item.observation}\n`;
    }

    for (const a of item.additions) {
      ticket += `     + ${a.name} (${formatCLP(Number(a.price) || 0)})\n`;
    }
  }

  ticket += `\n${sep}\n`;

  if (generalObservation) {
    ticket += `Nota: ${generalObservation}\n`;
    ticket += `${sep}\n`;
  }

  ticket += `TOTAL:  ${formatCLP(total)}\n`;
  ticket += `${sep}\n`;
  return ticket;
}

export function buildPrintRequestBody({
  products,
  total,
  tableNumber,
  game,
  availableGames = [],
  availableProducts = [],
  generalObservation,
  orderType,
}) {
  const enrichedProducts = Array.isArray(products)
    ? products.map((p) => {
        const template = availableProducts.find((ap) => ap.id === p.id);
        return {
          id: p.id,
          name: p.name || template?.name || 'Producto',
          price: p.price ?? template?.price ?? 0,
          category: p.category || template?.category || 'Otros',
          quantity: p.quantity || 1,
          observation: p.observation || '',
          additions: (Array.isArray(p.additions) ? p.additions : []).map((a) => ({
            name: a.name,
            price: Number(a.price) || 0,
          })),
        };
      })
    : [];

  const gameName = availableGames.find((g) => g.id?.toString() === game?.toString())?.name;

  return {
    products: enrichedProducts,
    total: Number(total) || 0,
    tableNumber: tableNumber || 0,
    availableGames: gameName ? [gameName] : [],
    generalObservation: generalObservation || '',
    orderType: orderType || 'En mesa',
  };
}
