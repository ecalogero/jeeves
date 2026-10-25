import { PublicClientApplication, AccountInfo, Configuration } from '@azure/msal-browser';

const MICROSOFT_CLIENT_ID = import.meta.env.VITE_MICROSOFT_CLIENT_ID ?? '';

const msalConfig: Configuration = {
  auth: {
    clientId: MICROSOFT_CLIENT_ID,
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
  },
};

const CALENDAR_SCOPES = ['Calendars.Read', 'User.Read'];

let _msalInstance: PublicClientApplication | null = null;

async function getMsalInstance(): Promise<PublicClientApplication> {
  if (!_msalInstance) {
    _msalInstance = new PublicClientApplication(msalConfig);
    await _msalInstance.initialize();
  }
  return _msalInstance;
}

export async function microsoftSignIn(): Promise<{ account: AccountInfo; accessToken: string } | null> {
  if (!MICROSOFT_CLIENT_ID) {
    throw new Error('VITE_MICROSOFT_CLIENT_ID is not set. Add it to your .env file.');
  }
  const msal = await getMsalInstance();
  const result = await msal.loginPopup({ scopes: CALENDAR_SCOPES });
  return { account: result.account!, accessToken: result.accessToken };
}

export async function getMicrosoftToken(): Promise<string | null> {
  const msal = await getMsalInstance();
  const accounts = msal.getAllAccounts();
  if (accounts.length === 0) return null;
  try {
    const result = await msal.acquireTokenSilent({ scopes: CALENDAR_SCOPES, account: accounts[0] });
    return result.accessToken;
  } catch {
    try {
      const result = await msal.acquireTokenPopup({ scopes: CALENDAR_SCOPES, account: accounts[0] });
      return result.accessToken;
    } catch {
      return null;
    }
  }
}

export async function getMicrosoftAccount(): Promise<AccountInfo | null> {
  const msal = await getMsalInstance();
  const accounts = msal.getAllAccounts();
  return accounts.length > 0 ? accounts[0] : null;
}

export async function microsoftSignOut(): Promise<void> {
  const msal = await getMsalInstance();
  const account = await getMicrosoftAccount();
  if (account) {
    await msal.logoutPopup({ account });
  }
}
