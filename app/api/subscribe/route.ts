import { NextResponse } from 'next/server';

const MAILERLITE_API_KEY = process.env.MAILERLITE_API_KEY;
const MAILERLITE_GROUP_ID = process.env.MAILERLITE_GROUP_ID;

interface SubscribeRequest {
  email: string;
}

export async function POST(request: Request) {
  try {
    const body: SubscribeRequest = await request.json();
    const { email } = body;

    // Validate email
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    // Check if API key is configured
    if (!MAILERLITE_API_KEY) {
      console.warn('MailerLite API key not configured. Accepting subscription anyway for development.');
      // In development, just accept the subscription
      return NextResponse.json({ success: true, message: 'Subscribed successfully!' });
    }

    // Subscribe to MailerLite
    const response = await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MAILERLITE_API_KEY}`,
      },
      body: JSON.stringify({
        email,
        groups: MAILERLITE_GROUP_ID ? [MAILERLITE_GROUP_ID] : undefined,
        fields: {
          source: 'adlint_pdf_unlock',
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // Handle duplicate subscriber (already subscribed)
      if (response.status === 409 || errorData.message?.includes('already')) {
        return NextResponse.json({
          success: true,
          message: 'You\'re already subscribed! PDF export unlocked.'
        });
      }

      console.error('MailerLite API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to subscribe. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Subscribed successfully! PDF export is now unlocked.'
    });
  } catch (error) {
    console.error('Subscribe route error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
