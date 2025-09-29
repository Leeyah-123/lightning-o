import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.type === 'funded') {
      // In this mock, lightningService already triggers watchers; respond OK
      return NextResponse.json({ ok: true });
    }
    if (body.type === 'payouts') {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false }, { status: 400 });
  } catch (e) {
    console.error('Error in lightning webhook:', e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
