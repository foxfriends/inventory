const graphql = require('./tag');

module.exports = graphql`
  mutation UpdateInventory($location: ID!, $adjustments: [InventoryAdjustItemInput!]!) {
    inventoryBulkAdjustQuantityAtLocation(inventoryItemAdjustments: $adjustments, locationId: $location) {
      userErrors {
        field
        message
      }
    }
  }
`;
