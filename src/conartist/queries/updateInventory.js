const graphql = require('./tag');

module.exports = graphql`
  mutation UpdateInventory($product: ProductMod!) {
    modUserProduct(product: $product) {
      id
      name
      sku
      quantity
    }
  }
`;
