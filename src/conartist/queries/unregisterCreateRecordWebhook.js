const graphql = require('./tag');

module.exports = graphql`
  mutation UnregisterCreateRecordWebhook($id: Int!) {
    deleteWebhookNewRecord(webhook: { id: $id })
  }
`;
