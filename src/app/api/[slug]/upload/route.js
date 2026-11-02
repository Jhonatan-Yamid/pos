import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req) {
  try {
    const data = await req.formData();
    const file = data.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const upload = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder: 'hierba-mala/providers' }, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        })
        .end(buffer);
    });

    return NextResponse.json({ url: upload.secure_url });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
