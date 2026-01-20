import ews from 'ews-javascript-api';
import { XhrApi } from '@ewsjs/xhr';

export interface ExchangeCredentials {
  email: string;
  username: string;
  password: string;
  ewsUrl: string;
}

export interface ExchangeConnectionResult {
  success: boolean;
  error?: string;
}

/**
 * Create EWS ExchangeService instance with NTLM authentication
 */
export function createExchangeService(creds: ExchangeCredentials): ews.ExchangeService {
  const service = new ews.ExchangeService(ews.ExchangeVersion.Exchange2013);

  // Configure NTLM authentication using @ewsjs/xhr
  // Both gzip and rejectUnauthorized settings are important
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const xhrApi = new XhrApi({ rejectUnauthorized: false } as any)
    .useNtlmAuthentication(creds.username, creds.password);

  // Set the XHR API for the service
  service.XHRApi = xhrApi;

  // IMPORTANT: Also set Credentials - EWS requires this even with XHRApi
  service.Credentials = new ews.WebCredentials(creds.username, creds.password);

  // Set EWS URL
  service.Url = new ews.Uri(creds.ewsUrl);

  return service;
}

/**
 * Test connection to Exchange server
 */
export async function testExchangeConnection(
  creds: ExchangeCredentials
): Promise<ExchangeConnectionResult> {
  try {
    const service = createExchangeService(creds);

    // Try to get calendar folder to verify connection
    const calendarFolder = await ews.Folder.Bind(
      service,
      ews.WellKnownFolderName.Calendar
    );

    if (calendarFolder) {
      return { success: true };
    }

    return { success: false, error: 'Could not access calendar folder' };
  } catch (error) {
    console.error('Exchange connection test error:', error);
    const message = error instanceof Error ? error.message : String(error);

    // Parse common EWS errors
    if (message.includes('401') || message.includes('Unauthorized')) {
      return { success: false, error: 'Invalid username or password' };
    }
    if (message.includes('404') || message.includes('Not Found')) {
      return { success: false, error: 'EWS endpoint not found. Please check the URL.' };
    }
    if (message.includes('ENOTFOUND') || message.includes('ECONNREFUSED')) {
      return { success: false, error: 'Could not connect to Exchange server' };
    }
    if (message.includes('certificate') || message.includes('SSL') || message.includes('TLS')) {
      return { success: false, error: 'SSL/TLS certificate error.' };
    }
    if (message.includes('Credentials are required')) {
      return { success: false, error: 'Authentication configuration error' };
    }

    return { success: false, error: message };
  }
}
