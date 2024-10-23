import axios from 'axios';
import Shopify from '@shopify/shopify-api';

import {IShopifyCustomerDetails} from '../types';

const extractIdFromShopifyId = (shopifyId: string) => {
  return shopifyId.split('/').pop();
};

export const getShopifyCustomer = async (
  shop: string,
  storefrontAccessToken: string,
  customerAccessToken: string,
  shopifyShopId: string
): Promise<IShopifyCustomerDetails> => {
  if (customerAccessToken.startsWith('shcat')) {
    // New Customer Account API
    const numericShopId = extractIdFromShopifyId(shopifyShopId);
    if (!numericShopId) {
      throw new Error('Invalid shopifyShopId format');
    }

    const response = await axios.post(
      // Using 2024-07 verison API, update later if required
      `https://shopify.com/${numericShopId}/account/customer/api/2024-07/graphql`,
      {
        query: `
          query customerDetails {
            customer {
              id
              firstName
              lastName
              displayName
              emailAddress {
                emailAddress
                marketingState
              }
              phoneNumber {
                phoneNumber
                marketingState
              }
            }
          }
        `,
        operationName: 'customerDetails'
      },
      {
        headers: {
          Authorization: customerAccessToken,
          'Content-Type': 'application/json'
        }
      }
    );

    const responseBody = response.data;
    if (responseBody?.errors) {
      throw responseBody.errors[0];
    }
    if (!responseBody?.data?.customer) {
      throw new Error('Customer details can not be found!');
    }

    const customer = responseBody.data.customer;
    return {
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      acceptsMarketing: customer.emailAddress?.marketingState === 'SUBSCRIBED',
      email: customer.emailAddress?.emailAddress,
      phone: customer.phoneNumber?.phoneNumber || null
    };
  } else {
    // Existing Storefront API
    // Load the current session to get the `accessToken`
    // GraphQLClient takes in the shop url and the accessToken for that shop.
    const client = new Shopify.Clients.Storefront(shop, storefrontAccessToken);

    const response: any = await client.query({
      data: {
        query: `query GetCustomer($customerAccessToken: String!) {
          customer(customerAccessToken: $customerAccessToken) {
            id
            firstName
            lastName
            acceptsMarketing
            email
            phone
          }
        }`,
        variables: {
          customerAccessToken
        }
      }
    });

    const responseBody = response.body as any;

    if (responseBody?.errors) {
      throw responseBody?.errors[0];
    }

    if (!responseBody?.data?.customer) {
      throw new Error('Customer details can not be found!');
    }
    return responseBody?.data?.customer;
  }
};
