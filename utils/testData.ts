import { faker } from 'faker';

/**
 * Test Data Generator
 * Generates random test data using Faker library
 */
export class TestDataGenerator {
  /**
   * Generate user data
   */
  static generateUser() {
    return {
      name: faker.name.fullName(),
      email: faker.internet.email(),
      password: faker.internet.password(12, true),
      phone: faker.phone.number(),
    };
  }

  /**
   * Generate product data
   */
  static generateProduct() {
    return {
      name: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      price: parseFloat(faker.commerce.price()),
      category: faker.commerce.department(),
    };
  }

  /**
   * Generate order data
   */
  static generateOrder() {
    return {
      orderId: faker.datatype.uuid(),
      quantity: faker.datatype.number({ min: 1, max: 10 }),
      totalPrice: parseFloat(faker.commerce.price()),
      orderDate: faker.date.recent(),
    };
  }

  /**
   * Generate address data
   */
  static generateAddress() {
    return {
      street: faker.address.streetAddress(),
      city: faker.address.city(),
      state: faker.address.state(),
      zipCode: faker.address.zipCode(),
      country: faker.address.country(),
    };
  }
}
