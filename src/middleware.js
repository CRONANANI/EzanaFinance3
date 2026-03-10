import { NextResponse } from 'next/server';

export async function middleware(req) {
  // For now, just pass through all requests
  // We'll handle auth protection at the page level instead
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
