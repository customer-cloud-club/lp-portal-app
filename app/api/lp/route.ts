import { NextResponse } from 'next/server';
import { getLPRecords } from '@/lib/larkbase-client';

// Cloudflare OpenNextではedge runtimeを使わない
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const publicOnly = searchParams.get('publicOnly') !== 'false';

    const records = await getLPRecords({ publicOnly });

    return NextResponse.json({
      success: true,
      data: records,
      count: records.length,
    });
  } catch (error: any) {
    console.error('Failed to fetch LP records:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch LP records',
      },
      { status: 500 }
    );
  }
}
