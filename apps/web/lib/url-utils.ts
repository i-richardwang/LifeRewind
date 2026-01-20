/**
 * URL normalization utilities for browser history deduplication
 */

// Hosts to completely skip (data collected from other sources)
const SKIP_HOSTS = [
  'mail.google.com', // Email collected separately
  'calendar.google.com', // Calendar collected separately
  'outlook.live.com', // Email/Calendar collected separately
  'outlook.office.com', // Email/Calendar collected separately
  'outlook.office365.com', // Email/Calendar collected separately
];

// Search engines - keep their query parameters (q, query, search, etc.)
const SEARCH_ENGINE_HOSTS = [
  'google.com',
  'google.co',
  'bing.com',
  'baidu.com',
  'duckduckgo.com',
  'yahoo.com',
  'yandex.com',
  'yandex.ru',
  'sogou.com',
  'so.com',
  'ecosia.org',
  'startpage.com',
  'qwant.com',
  'perplexity.ai',
];

// Parameters to always remove (tracking, session, cache-busting)
const STRIP_PARAMS = [
  // Tracking parameters
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'utm_cid',
  'fbclid',
  'gclid',
  'gclsrc',
  'msclkid',
  'twclid',
  'dclid',
  'zanpid',
  'igshid',
  '_ga',
  '_gid',
  '_gl',
  'mc_cid',
  'mc_eid',
  'oly_anon_id',
  'oly_enc_id',
  '__s',
  'vero_id',
  'mkt_tok',
  'trk',
  'trkCampaign',
  'sc_campaign',
  'sc_channel',
  'sc_content',
  'sc_medium',
  'sc_outcome',
  'sc_geo',
  'sc_country',

  // Session and authentication (temporary)
  'sessionid',
  'session_id',
  'sid',
  'jsessionid',
  'phpsessid',
  'aspsessionid',
  'token',
  'auth_token',
  'access_token',
  'refresh_token',
  'csrf',
  'csrf_token',
  '_csrf',
  'nonce',

  // OAuth and authentication flow params
  'authorization_session_id',
  'auth_session_id',
  'user_code',
  'device_code',
  'code',
  'state',
  'redirect_uri',
  'redirect_url',
  'redirecturi',
  'redirecturl',
  'return_url',
  'return_to',
  'returnurl',
  'returnto',
  'jumpto',
  'jump_to',
  'goto',
  'go_to',
  'target',
  'target_url',
  'dest',
  'destination',
  'next',
  'callback',
  'continue',
  'client_id',
  'client_secret',
  'response_type',
  'scope',
  'prompt',
  'login_hint',
  'code_challenge',
  'code_verifier',

  // Cache busting (be careful not to remove meaningful short params like YouTube's 'v')
  '_t',
  'ts',
  '_ts',
  'timestamp',
  '_',
  '__',
  'cb',
  'cache',
  'nocache',
  '_v',
  'ver',
  'version',
  'rand',
  'random',
  '_r',

  // Analytics and tracking IDs
  'ref',
  'referer',
  'referrer',
  'source',
  'src',
  'from',
  'via',
  'affiliate',
  'aff',
  'partner',
  'campaign',
  'ad',
  'adid',
  'ad_id',
  'creativeid',
  'placement',

  // Social sharing
  'share',
  'shared',
  'spm',
  'scm',
];

// Parameters that indicate in-site search (remove for non-search-engines)
const SITE_SEARCH_PARAMS = [
  'q',
  'query',
  'search',
  'search_query',
  'searchquery',
  's',
  'keyword',
  'keywords',
  'k',
  'term',
  'text',
  'find',
  'lookup',
];

// Parameters to always keep (pagination, content identifiers)
const KEEP_PARAMS = [
  // Pagination
  'page',
  'p',
  'pg',
  'offset',
  'start',
  'limit',
  'per_page',
  'pagesize',
  'page_size',
  'cursor',
  'after',
  'before',

  // Content identifiers
  'id',
  'postid',
  'post_id',
  'articleid',
  'article_id',
  'videoid',
  'video_id',
  'pid',
  'uid',
  'item',
  'product',
  'sku',

  // View/tab state
  'tab',
  'view',
  'mode',
  'type',
  'category',
  'cat',
  'sort',
  'order',
  'filter',
  'lang',
  'locale',
  'hl',
  'gl',
];

/**
 * Check if the host matches a search engine
 */
function isSearchEngine(host: string): boolean {
  const normalizedHost = host.toLowerCase().replace(/^www\./, '');

  return SEARCH_ENGINE_HOSTS.some(
    (engine) => normalizedHost === engine || normalizedHost.endsWith(`.${engine}`)
  );
}

/**
 * Check if a URL should be completely skipped (not stored at all)
 * Used for URLs where data is collected from other sources (email, calendar, etc.)
 */
export function shouldSkipUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.host.toLowerCase().replace(/^www\./, '');

    return SKIP_HOSTS.some(
      (skipHost) => host === skipHost || host.endsWith(`.${skipHost}`)
    );
  } catch {
    return false;
  }
}

/**
 * Check if a parameter should be stripped
 */
function shouldStripParam(param: string, isSearchEngineSite: boolean): boolean {
  const lowerParam = param.toLowerCase();

  // Always strip tracking/session/cache params
  if (STRIP_PARAMS.includes(lowerParam)) {
    return true;
  }

  // Strip site search params only for non-search-engines
  if (!isSearchEngineSite && SITE_SEARCH_PARAMS.includes(lowerParam)) {
    return true;
  }

  return false;
}

/**
 * Check if a parameter should definitely be kept
 */
function shouldKeepParam(param: string): boolean {
  return KEEP_PARAMS.includes(param.toLowerCase());
}

/**
 * Normalize hash fragment by decoding URL-encoded characters
 * This ensures #level-4%3A-skills-%26-automation equals #level-4:-skills-&-automation
 */
function normalizeHash(hash: string): string {
  if (!hash) return '';

  try {
    // Decode URL-encoded characters
    let decoded = decodeURIComponent(hash);

    // Normalize common variations:
    // - Replace special chars that might have encoding variants
    // - Lowercase for consistency
    decoded = decoded.toLowerCase();

    return decoded;
  } catch {
    // If decoding fails, return as-is (lowercase)
    return hash.toLowerCase();
  }
}

/**
 * Normalize a URL for deduplication
 *
 * Strategy:
 * - Search engines: keep query params (to track what was searched)
 * - Other sites: remove site search params (noise)
 * - Always remove: tracking, session, cache-busting params
 * - Always keep: pagination, content IDs, hash routes
 * - Normalize hash fragments (decode URL encoding)
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);

    // Check if this is a search engine
    const isSearchEngineSite = isSearchEngine(parsed.host);

    // Process query parameters
    const paramsToKeep: [string, string][] = [];

    parsed.searchParams.forEach((value, key) => {
      // Always keep explicit keep-list params
      if (shouldKeepParam(key)) {
        paramsToKeep.push([key, value]);
        return;
      }

      // Check if should be stripped
      if (shouldStripParam(key, isSearchEngineSite)) {
        return;
      }

      // For search engines, keep all remaining params
      // For other sites, also keep remaining params (they might be meaningful)
      paramsToKeep.push([key, value]);
    });

    // Rebuild URL with filtered params
    parsed.search = '';
    paramsToKeep.forEach(([key, value]) => {
      parsed.searchParams.append(key, value);
    });

    // Sort params for consistent hashing
    parsed.searchParams.sort();

    // Normalize hash (decode URL encoding for consistency)
    if (parsed.hash) {
      parsed.hash = normalizeHash(parsed.hash);
    }

    return parsed.toString();
  } catch {
    // If URL parsing fails, return as-is
    return url;
  }
}

/**
 * Extract the base URL (without query params and hash) for grouping
 */
export function getBaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return url;
  }
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.host.replace(/^www\./, '');
  } catch {
    return '';
  }
}
