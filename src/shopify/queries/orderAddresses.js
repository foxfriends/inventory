const graphql = require('./tag');

module.exports = graphql`
  query OrderAddresses($after: String) {
    orders(query: "fulfillment_status:unshipped", first: 50, after: $after) {
      pageInfo { hasNextPage }
      edges {
        cursor
        node {
          shippingAddress {
            formatted(withCompany: true, withName: true)
          }
        }
      }
    }
  }
`;
