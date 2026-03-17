import { test, expect } from '@playwright/test';
import { APIClient } from '../../api/apiClient';
import { ENDPOINTS } from '../../api/endpoints';

test.describe('Delete User API Tests', () => {
  let apiClient: APIClient;

  test.beforeAll(() => {
    apiClient = new APIClient();
  });

  test('should delete user successfully', async () => {
    const userId = 'user-123';
    const response = await apiClient.delete(`${ENDPOINTS.USERS}/${userId}`);
    expect(response.status()).toBe(204);
  });

  test('should return 404 for non-existent user', async () => {
    const userId = 'non-existent-user';
    const response = await apiClient.delete(`${ENDPOINTS.USERS}/${userId}`);
    expect(response.status()).toBe(404);
  });
});
