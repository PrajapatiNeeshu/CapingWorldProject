import { test, expect } from '@playwright/test';
import { APIClient } from '../../api/apiClient';
import { ENDPOINTS } from '../../api/endpoints';

test.describe('Create User API Tests', () => {
  let apiClient: APIClient;

  test.beforeAll(() => {
    apiClient = new APIClient();
  });

  test('should create a new user', async () => {
    const userData = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: 'securePassword123',
    };

    const response = await apiClient.post(ENDPOINTS.USERS, userData);
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.email).toBe(userData.email);
  });

  test('should not create user with duplicate email', async () => {
    const userData = {
      name: 'Jane Doe',
      email: 'existing@example.com',
      password: 'securePassword123',
    };

    const response = await apiClient.post(ENDPOINTS.USERS, userData);
    expect(response.status()).toBe(409);
  });
});
