import { test, expect } from '@playwright/test';
import { APIClient } from '../../api/apiClient';
import { ENDPOINTS } from '../../api/endpoints';

test.describe('Update User API Tests', () => {
  let apiClient: APIClient;

  test.beforeAll(() => {
    apiClient = new APIClient();
  });

  test('should update user details', async () => {
    const userId = 'user-123';
    const updateData = {
      name: 'John Updated',
      email: 'john.updated@example.com',
    };

    const response = await apiClient.put(`${ENDPOINTS.USERS}/${userId}`, updateData);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.name).toBe(updateData.name);
  });
});
