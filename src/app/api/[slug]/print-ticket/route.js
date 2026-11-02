import { NextResponse } from 'next/server';
import escpos from 'escpos';
import { promisify } from 'util';
import { resolveTenantConfig } from '@/libs/tenantConfig';

// Configura escpos para usar USB
const escposUSB = require('escpos-usb');
escpos.USB = escposUSB;

export async function POST(request, { params }) {
  try {
    const { products, total } = await request.json();
    const tenantConfig = await resolveTenantConfig(params.slug);
    const appName = tenantConfig?.app_name ?? 'POS';

    const device = new escpos.USB();
    const openDevice = promisify(device.open).bind(device);

    await openDevice();

    const printer = new escpos.Printer(device);

    printer
      .align('CT')
      .style('B')
      .size(1, 1)
      .text(appName)
      .text('--------------------------')
      .align('LT');

    products.forEach((p) => {
      printer.text(`${p.name} x${p.quantity}  $${p.price * p.quantity}`);
      if (p.observation) {
        printer.text(`Obs: ${p.observation}`);
      }
      if (Array.isArray(p.additions) && p.additions.length > 0) {
        p.additions.forEach((a) => {
          printer.text(`+ ${a.name}  $${a.price}`);
        });
      }
    });

    printer
      .text('--------------------------')
      .align('RT')
      .text(`TOTAL: $${total}`)
      .cut()
      .close();

    return NextResponse.json({ message: 'Ticket impreso correctamente' }, { status: 200 });
  } catch (error) {
    console.error('Error al imprimir:', error);
    return NextResponse.json({ message: error.message || 'Error inesperado' }, { status: 500 });
  }
}
