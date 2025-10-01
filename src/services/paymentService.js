const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Process Stripe payment
const processStripePayment = async (payment, paymentMethodId) => {
  try {
    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(payment.amount * 100), // Convert to cents
      currency: payment.currency.toLowerCase(),
      payment_method: paymentMethodId,
      confirmation_method: 'manual',
      confirm: true,
      description: payment.description,
      metadata: {
        paymentId: payment.id,
        userId: payment.userId,
        system: 'autoprint'
      }
    });

    if (paymentIntent.status === 'succeeded') {
      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status
      };
    } else if (paymentIntent.status === 'requires_action') {
      return {
        success: false,
        requiresAction: true,
        clientSecret: paymentIntent.client_secret,
        error: 'Payment requires additional authentication'
      };
    } else {
      return {
        success: false,
        error: 'Payment failed',
        status: paymentIntent.status
      };
    }

  } catch (error) {
    console.error('Stripe payment error:', error);
    
    if (error.type === 'StripeCardError') {
      return {
        success: false,
        error: error.message
      };
    }
    
    return {
      success: false,
      error: 'Payment processing failed'
    };
  }
};

// Create Stripe customer
const createStripeCustomer = async (user) => {
  try {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.getFullName(),
      metadata: {
        userId: user.id,
        studentId: user.studentId || '',
        system: 'autoprint'
      }
    });

    return {
      success: true,
      customerId: customer.id
    };
  } catch (error) {
    console.error('Stripe customer creation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Refund Stripe payment
const refundStripePayment = async (paymentIntentId, amount = null) => {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      ...(amount && { amount: Math.round(amount * 100) }) // Convert to cents if amount specified
    });

    return {
      success: true,
      refundId: refund.id,
      amount: refund.amount / 100, // Convert back to dollars
      status: refund.status
    };
  } catch (error) {
    console.error('Stripe refund error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get payment methods for customer
const getCustomerPaymentMethods = async (customerId) => {
  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card'
    });

    return {
      success: true,
      paymentMethods: paymentMethods.data
    };
  } catch (error) {
    console.error('Stripe payment methods error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Handle Stripe webhook
const handleStripeWebhook = async (body, signature) => {
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    switch (event.type) {
      case 'payment_intent.succeeded':
        console.log('Payment succeeded:', event.data.object.id);
        // Update payment status in database
        break;
        
      case 'payment_intent.payment_failed':
        console.log('Payment failed:', event.data.object.id);
        // Update payment status in database
        break;
        
      case 'charge.dispute.created':
        console.log('Dispute created:', event.data.object.id);
        // Handle dispute
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return { success: true, event };
  } catch (error) {
    console.error('Webhook error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

module.exports = {
  processStripePayment,
  createStripeCustomer,
  refundStripePayment,
  getCustomerPaymentMethods,
  handleStripeWebhook
};