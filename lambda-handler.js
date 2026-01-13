/**
 * AWS Lambda Handler for Attio Webhook
 * Receives webhook, validates, and invokes worker Lambda async
 */

import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

// Lambda handler
export const handler = async (event) => {
  const startTime = Date.now();
  
  console.log('📨 Webhook Received:', {
    timestamp: new Date().toISOString(),
    body: event.body,
    headers: event.headers
  });
  
  // DEBUG: Log entire event to see what we're actually receiving
  console.log('🔍 Full event structure:', JSON.stringify(event, null, 2));

  try {
    // Parse incoming webhook payload
    const webhookPayload = typeof event.body === 'string'
      ? JSON.parse(event.body)
      : event.body;

    // Extract first event from events array
    const webhookEvent = webhookPayload.events?.[0];

    if (!webhookEvent) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'No events found in webhook payload'
        })
      };
    }

    // Validate event type
    if (webhookEvent.event_type !== 'call-recording.created') {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Invalid event type',
          expected: 'call-recording.created',
          received: webhookEvent.event_type
        })
      };
    }

    // Extract IDs
    const { meeting_id, call_recording_id } = webhookEvent.id || {};

    if (!meeting_id || !call_recording_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Missing required fields',
          required: ['id.meeting_id', 'id.call_recording_id']
        })
      };
    }

    console.log('📋 Webhook validated:', { meeting_id, call_recording_id });

    // Invoke worker Lambda asynchronously (fire and forget)
    const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION || 'ap-southeast-1' });
    
    const invokeCommand = new InvokeCommand({
      FunctionName: process.env.WORKER_LAMBDA_NAME || 'attio-webhook-worker',
      InvocationType: 'Event', // Async invocation
      Payload: JSON.stringify({
        meeting_id,
        call_recording_id
      })
    });

    console.log('🚀 Invoking worker Lambda...');
    await lambdaClient.send(invokeCommand);
    console.log('✅ Worker Lambda invoked successfully');

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    // Respond immediately with 202 Accepted
    return {
      statusCode: 202,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: 'Webhook received, processing started',
        meeting_id,
        call_recording_id,
        response_time_seconds: parseFloat(elapsed)
      })
    };

  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.error('❌ Error:', {
      message: error.message,
      stack: error.stack,
      time: `${elapsed}s`
    });

    return {
      statusCode: 200, // Return 200 to prevent Attio from retrying
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        processing_time_seconds: parseFloat(elapsed)
      })
    };
  }
};

