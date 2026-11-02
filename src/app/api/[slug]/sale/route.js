// src/app/api/[slug]/sale/route.js
import { NextResponse } from 'next/server';
import { resolveTenantConfig } from '@/libs/tenantConfig';
import { getTenantDb } from '@/libs/tenantDb';
import { nanoid } from 'nanoid';
import { normalizeSalePayload, validateSalePayload } from '@/services/saleService';

export async function GET(request, { params }) {
  const tenantConfig = await resolveTenantConfig(params.slug);
  if (!tenantConfig) {
    return NextResponse.json({ message: 'Tenant no encontrado.' }, { status: 404 });
  }
  const db = getTenantDb(tenantConfig);
  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    let gte, lte;
    if (startDateParam && endDateParam) {
      gte = new Date(startDateParam);
      lte = new Date(endDateParam);
    } else {
      lte = new Date();
      gte = new Date();
      gte.setDate(gte.getDate() - 30);
    }

    const sales = await db.sale.findMany({
      where: {
        createdAt: { gte, lte },
      },
      include: {
        products: {
          include: {
            product: true,
          },
        },
        game: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(sales, { status: 200 });
  } catch (error) {
    console.error('Error al obtener las ventas:', error);
    return NextResponse.json({ message: 'Error al obtener las ventas' }, { status: 500 });
  } finally {
    await db.$disconnect();
  }
}

export async function POST(request, { params }) {
  const tenantConfig = await resolveTenantConfig(params.slug);
  if (!tenantConfig) {
    return NextResponse.json({ message: 'Tenant no encontrado.' }, { status: 404 });
  }
  const db = getTenantDb(tenantConfig);
  try {
    const data = await request.json();
    const payload = normalizeSalePayload(data);
    const validationError = validateSalePayload(payload);

    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }

    const { tableNumber, saleStatus, generalObservation, totalAmount, products, game, orderType } =
      payload;

    if (!products || products.length === 0) {
      return NextResponse.json(
        { message: 'Debe seleccionar al menos un producto' },
        { status: 400 }
      );
    }

    const gameId = game ? parseInt(game, 10) : null;
    if (game && isNaN(gameId)) {
      return NextResponse.json({ message: 'ID de juego inválido' }, { status: 400 });
    }

    const newSale = await db.sale.create({
      data: {
        totalAmount,
        status: saleStatus || 'en proceso',
        table: String(tableNumber),
        generalObservation,
        orderType: orderType || 'En mesa',
        ...(gameId ? { game: { connect: { id: gameId } } } : {}),
      },
    });

    for (const product of products) {
      const saleProduct = await db.saleProduct.create({
        data: {
          id: nanoid(),
          saleId: newSale.id,
          productId: product.id,
          quantity: product.quantity,
          observation: product.observation || '',
        },
      });

      await Promise.all(
        product.additions.map((addition) => {
          return db.saleProductAddition.create({
            data: {
              saleProductId: saleProduct.id,
              name: addition.name,
              price: addition.price,
              additionId: addition.id,
            },
          });
        })
      );

      // Descontar ingredientes del inventario
      const ingredients = await db.productIngredient.findMany({
        where: { productId: product.id },
      });

      for (const ing of ingredients) {
        const ingredient = await db.ingredient.findUnique({
          where: { id: ing.ingredientId },
          select: { id: true, quantity: true },
        });

        if (!ingredient) continue;

        const totalToDecrement = ing.quantity * product.quantity;

        if (ingredient.quantity > 0) {
          const newQuantity = Math.max(0, ingredient.quantity - totalToDecrement);

          if (newQuantity !== ingredient.quantity) {
            await db.ingredient.update({
              where: { id: ing.ingredientId },
              data: { quantity: newQuantity },
            });
          }
        } else {
          console.warn(
            `⚠️ Ingrediente ${ing.ingredientId} tiene existencia 0, no se descuenta más.`
          );
        }
      }
    }

    const finalSale = await db.sale.findUnique({
      where: { id: newSale.id },
      include: {
        game: true,
        products: {
          include: {
            product: true,
            additions: true,
          },
        },
      },
    });

    return NextResponse.json(finalSale, { status: 201 });
  } catch (error) {
    console.error('Error al crear la venta:', error);
    if (error.code === 'P2003' && error.meta?.field_name === 'gameId') {
      return NextResponse.json(
        { message: 'El ID de juego proporcionado no existe.' },
        { status: 400 }
      );
    }
    return NextResponse.json({ message: 'Error al crear la venta' }, { status: 500 });
  } finally {
    await db.$disconnect();
  }
}

export async function DELETE(request, { params }) {
  const tenantConfig = await resolveTenantConfig(params.slug);
  if (!tenantConfig) {
    return NextResponse.json({ message: 'Tenant no encontrado.' }, { status: 404 });
  }
  const db = getTenantDb(tenantConfig);
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const saleIdInt = parseInt(id);

    if (isNaN(saleIdInt)) {
      return NextResponse.json(
        { message: 'ID de venta inválido o no proporcionado en la URL' },
        { status: 400 }
      );
    }

    await db.$transaction(async (prisma) => {
      const saleProducts = await prisma.saleProduct.findMany({
        where: { saleId: saleIdInt },
        include: {
          product: true,
        },
      });

      for (const sp of saleProducts) {
        const ingredients = await prisma.productIngredient.findMany({
          where: { productId: sp.productId },
        });

        for (const ing of ingredients) {
          const ingredient = await prisma.ingredient.findUnique({
            where: { id: ing.ingredientId },
            select: { id: true, quantity: true },
          });

          if (!ingredient) {
            console.warn(`⚠️ Ingrediente ${ing.ingredientId} no encontrado, se omite.`);
            continue;
          }

          const totalToIncrement = ing.quantity * sp.quantity;
          const newQuantity = ingredient.quantity + totalToIncrement;

          await prisma.ingredient.update({
            where: { id: ing.ingredientId },
            data: { quantity: newQuantity },
          });
        }
      }

      await prisma.saleProductAddition.deleteMany({
        where: {
          saleProduct: {
            saleId: saleIdInt,
          },
        },
      });

      await prisma.saleProduct.deleteMany({
        where: {
          saleId: saleIdInt,
        },
      });

      await prisma.sale.delete({
        where: { id: saleIdInt },
      });
    });

    return NextResponse.json(
      { message: `Venta con ID ${saleIdInt} eliminada exitosamente` },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al eliminar la venta:', error);
    if (error.code === 'P2025') {
      return NextResponse.json(
        { message: `Venta con ID ${id} no encontrada.` },
        { status: 404 }
      );
    }
    const errorMessage =
      error instanceof Error ? error.message : 'Error desconocido al eliminar la venta';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  } finally {
    await db.$disconnect();
  }
}
