const graphql = require('./tag');

module.exports = graphql`
  mutation RegisterForWebhooks($createCallback: URL!, $cancelledCallback: URL!) {
    createOrdersHook: webhookSubscriptionCreate(topic: ORDERS_CREATE, webhookSubscription: { callbackUrl: $createCallback, format: JSON }) {
      userErrors { message }
    }
    cancelOrdersHook: webhookSubscriptionCreate(topic: ORDERS_CANCELLED, webhookSubscription: { callbackUrl: $cancelledCallback, format: JSON }) {
      userErrors { message }
    }
  }
`;
