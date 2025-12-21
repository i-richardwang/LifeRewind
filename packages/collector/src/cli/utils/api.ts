import { input } from '@inquirer/prompts';
import { showMaskedKey } from './prompts.js';

/**
 * Input API URL with validation
 */
export async function inputApiUrl(defaultUrl = 'http://localhost:3000'): Promise<string> {
  return input({
    message: 'API Base URL:',
    default: defaultUrl,
    validate: (value) => {
      try {
        new URL(value);
        return true;
      } catch {
        return 'Please enter a valid URL';
      }
    },
  });
}

/**
 * Input API Key with masked confirmation
 */
export async function inputApiKey(): Promise<string> {
  const apiKey = await input({
    message: 'API Key:',
    validate: (value) => (value.length > 0 ? true : 'API Key is required'),
  });
  showMaskedKey(apiKey);
  return apiKey;
}
