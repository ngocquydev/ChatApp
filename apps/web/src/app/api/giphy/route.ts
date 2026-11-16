import { NextResponse } from 'next/server';
import { GiphyFetch } from '@giphy/js-fetch-api';

const GIPHY_KEY = process.env.NEXT_GIPHY_API_KEY || '';
const gf = GIPHY_KEY ? new GiphyFetch(GIPHY_KEY) : null;

export async function GET(request: Request) {
  try {
    if (!gf) {
      return NextResponse.json(
        { error: 'Thiếu cấu hình GIPHY_API_KEY trong biến môi trường', data: [] },
        { status: 200 }
      );
    }
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const offset = Number(searchParams.get('offset')) || 0;
    const limit = Number(searchParams.get('limit')) || 20;
    const result = query
      ? await gf.search(query, { offset, limit, lang: 'vi' })
      : await gf.trending({ offset, limit });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Lỗi API Giphy:', error);
    return NextResponse.json(
      { error: 'Không thể kết nối đến máy chủ Giphy', data: [] },
      { status: 500 }
    );
  }
}
