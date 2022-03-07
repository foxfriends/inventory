const graphql = require('./tag');

module.exports = graphql`
  mutation UnregisterDeleteRecordWebhook($id: Int!) {
    deleteWebhookDeleteRecord(webhook: { id: $id })
  }
`;
