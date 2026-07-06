/**
 * app/api/csrf-token/route.ts
 * [FIX V25] Endpoint to get fresh CSRF token
 */

import { NextResponse } from 'next/server';
import { generateCsrfToken, CSRF_COOKIE_NAME } from '@/lib/csrf';

export async function GET(req: Request) {
  try {
    const token = generateCsrfToken();
    
    const response = NextResponse.json({
      csrfToken: token,
      headerName: 'X-CSRF-Token',
    });
    
    // Set token as HTTP-only cookie
    const isProduction = process.env.NODE_ENV === 'production';
    response.cookies.set(CSRF_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });
    
    return response;
  } catch (error: any) {
    console.error('[CSRF] Token generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
}
