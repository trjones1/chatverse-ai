// app/api/geo/route.ts - Detect user's country from IP
import { NextRequest, NextResponse } from 'next/server';
import { detectCountryFromHeaders, getLocaleForCountry } from '@/lib/localization';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const country = detectCountryFromHeaders(request.headers);
    const locale = getLocaleForCountry(country);

    return NextResponse.json({
      success: true,
      country,
      locale,
    });
  } catch (error) {
    console.error('Error detecting geo location:', error);

    // Fallback to US
    return NextResponse.json({
      success: true,
      country: 'US',
      locale: getLocaleForCountry('US'),
    });
  }
}
