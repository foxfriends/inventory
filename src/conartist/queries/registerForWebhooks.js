const graphql = require('./tag');

module.exports = graphql`
  mutation RegisterForWebhooks($createCallback: String!, $cancelledCallback: String!) {
    createOrdersHook: createWebhookNewRecord(webhook: { url: $createCallback }) { id }
    cancelOrdersHook: createWebhookDeleteRecord(webhook: { url: $cancelledCallback }) { id }
  }
`;
