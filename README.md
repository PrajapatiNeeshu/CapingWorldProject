# Hybrid Automation Framework with Playwright + TypeScript

A comprehensive end-to-end automation framework supporting both **UI Automation** and **API Automation** using Playwright and TypeScript/JavaScript.

## 📁 Project Structure

```
playwright-framework
│
├── tests                          # Test specifications
│   ├── ui                         # UI/E2E tests
│   │    ├── login.spec.ts        # Login test examples
│   │    ├── dashboard.spec.ts    # Dashboard test examples
│   │
│   ├── api                        # API tests
│        ├── createUser.spec.ts    # Create user API tests
│        ├── updateUser.spec.ts    # Update user API tests
│        ├── deleteUser.spec.ts    # Delete user API tests
│
├── pages                          # Page Object Models (POM)
│     ├── LoginPage.ts            # Login page elements & methods
│     ├── DashboardPage.ts        # Dashboard page elements & methods
│
├── api                            # API testing utilities
│     ├── endpoints.ts            # API endpoints configuration
│     ├── apiClient.ts            # API client for HTTP requests
│
├── fixtures                       # Test fixtures
│     ├── authFixture.ts          # Authentication fixture
│
├── utils                          # Utility functions
│     ├── config.ts               # Configuration management
│     ├── testData.ts             # Test data generation
│
├── playwright.config.ts           # Playwright configuration
├── tsconfig.json                  # TypeScript configuration
├── .env.example                   # Environment variables template
├── .gitignore                     # Git ignore rules
└── package.json                   # Project dependencies
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd playwright-framework
```

2. Install dependencies:
```bash
npm install
```

3. Install Playwright browsers:
```bash
npx playwright install
```

4. Create `.env` file from template:
```bash
cp .env.example .env
```

5. Update `.env` with your configuration

## 📝 Running Tests

### Run All Tests
```bash
npm test
```

### Run UI Tests Only
```bash
npm run test:ui
```

### Run API Tests Only
```bash
npm run test:api
```

### Run Tests in Headed Mode
```bash
npm run test:headed
```

### Run Tests in Debug Mode
```bash
npm run test:debug
```

### View Test Report
```bash
npm run test:report
```

## 📋 Configuration

### Environment Variables

Update `.env` file with the following variables:

```env
# Environment
ENVIRONMENT=development
CI=false

# URLs
BASE_URL=https://example.com
API_BASE_URL=https://api.example.com

# Credentials
TEST_USER_EMAIL=testuser@example.com
TEST_USER_PASSWORD=password123

# Playwright
HEADLESS=true
SLOW_MO=0

# Logging
VERBOSE=false

# Retry Settings
RETRY_ATTEMPTS=2
```

### Playwright Configuration

Edit `playwright.config.ts` to customize:
- Browser configurations
- Test timeouts
- Retry attempts
- Reporter options
- Web server settings

## 🏗️ Architecture

### Page Object Model (POM)

Pages encapsulate UI elements and interactions:

```typescript
import { Page } from '@playwright/test';

export class LoginPage {
  page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async login(email: string, password: string) {
    await this.page.fill('[data-testid="email"]', email);
    await this.page.fill('[data-testid="password"]', password);
    await this.page.click('[data-testid="login-btn"]');
  }
}
```

### API Client

Centralized API client for HTTP requests:

```typescript
import { APIClient } from '@api/apiClient';

const apiClient = new APIClient();
const response = await apiClient.get('/api/users');
const createdUser = await apiClient.post('/api/users', userData);
```

### Fixtures

Reusable test fixtures for setup and authentication:

```typescript
import { test, expect } from '@fixtures/authFixture';

test('should perform action as authenticated user', async ({ authenticatedPage }) => {
  // Test with authenticated page
});
```

### Utilities

- **config.ts**: Centralized configuration management
- **testData.ts**: Test data generation using Faker

## 📚 Examples

### UI Test Example

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';

test('should login successfully', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('user@example.com', 'password123');
  await expect(page).toHaveURL(/.*dashboard/);
});
```

### API Test Example

```typescript
import { test, expect } from '@playwright/test';
import { APIClient } from '../../api/apiClient';
import { ENDPOINTS } from '../../api/endpoints';

test('should create a user', async () => {
  const apiClient = new APIClient();
  const response = await apiClient.post(ENDPOINTS.USERS, {
    name: 'John Doe',
    email: 'john@example.com',
  });
  expect(response.status()).toBe(201);
});
```

## 🔧 Debugging

### Run Tests in Debug Mode

```bash
npm run test:debug
```

This opens Playwright Inspector where you can:
- Step through code
- Inspect elements
- Evaluate expressions
- View test logs

### View Test Results

HTML Report:
```bash
npm run test:report
```

### Enable Verbose Logging

```bash
VERBOSE=true npm test
```

## 📦 Dependencies

- **@playwright/test**: ^1.58.2 - Playwright testing framework
- **playwright**: ^1.58.2 - Playwright browser automation
- **axios**: ^1.13.6 - HTTP client for API testing
- **dotenv**: ^17.3.1 - Environment variable management
- **faker**: ^6.6.6 - Test data generation
- **@cucumber/cucumber**: ^12.7.0 - BDD framework (optional)

## 📖 Best Practices

1. **Use Page Object Model**: Keep tests clean and maintainable
2. **Data-driven Testing**: Use testData utilities for realistic data
3. **Fixtures**: Leverage fixtures for common setup/teardown
4. **Explicit Waits**: Use Playwright's built-in waiting mechanisms
5. **Assertion Messages**: Add descriptive error messages
6. **Base URLs**: Use configuration for environment-specific URLs
7. **Error Handling**: Implement proper error handling in utilities

## 🐛 Troubleshooting

### Issue: Playwright browsers not installed
**Solution**: Run `npx playwright install`

### Issue: Tests timeout
**Solution**: Check network connectivity and adjust timeout in `playwright.config.ts`

### Issue: Authentication failures in API tests
**Solution**: Verify credentials in `.env` file and API endpoint configuration

## 📞 Support

For issues or questions, please create a GitHub issue or contact the team.

## 📄 License

ISC

---

**Happy Testing! 🎉**
