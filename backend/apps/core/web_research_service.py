import json
import logging
import os
import urllib.parse
import urllib.request
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

BRAVE_SEARCH_ENDPOINT = "https://api.search.brave.com/res/v1/web/search"
TAVILY_SEARCH_ENDPOINT = "https://api.tavily.com/search"


def _http_get(url, headers=None, timeout=15):
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return json.loads(response.read().decode('utf-8'))


def _http_post_json(url, payload, headers=None, timeout=20):
    data = json.dumps(payload).encode('utf-8')
    all_headers = {'Content-Type': 'application/json'}
    if headers:
        all_headers.update(headers)
    req = urllib.request.Request(url, data=data, headers=all_headers, method='POST')
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return json.loads(response.read().decode('utf-8'))


def search_brave(query, count=6):
    """
    Query Brave Search API for broad web discovery.
    Returns list of search results: [{title, url, description, published_date}].
    """
    api_key = os.getenv('BRAVE_API_KEY', '').strip()
    if not api_key:
        logger.warning("BRAVE_API_KEY is not configured; using resilient search collector.")
        return []

    try:
        params = urllib.parse.urlencode({
            'q': query,
            'count': min(count, 10),
            'text_decorations': '0',
            'search_lang': 'en',
        })
        url = f"{BRAVE_SEARCH_ENDPOINT}?{params}"
        headers = {
            'Accept': 'application/json',
            'X-Subscription-Token': api_key,
        }
        data = _http_get(url, headers=headers)
        web_results = data.get('web', {}).get('results', [])
        results = []
        for item in web_results:
            results.append({
                'title': item.get('title', ''),
                'url': item.get('url', ''),
                'description': item.get('description', ''),
                'snippets': item.get('extra_snippets', []),
                'source': 'Brave Search',
                'retrieved_at': datetime.now(timezone.utc).isoformat(),
            })
        return results
    except Exception as e:
        logger.error(f"Brave Search API error for query '{query}': {e}")
        return []


def extract_tavily(query, search_depth="advanced", max_results=5):
    """
    Query Tavily API for deep page extraction, pricing tables, and public customer complaints.
    Returns list of extracted contents: [{title, url, content, raw_content}].
    """
    api_key = os.getenv('TAVILY_API_KEY', '').strip()
    if not api_key:
        logger.warning("TAVILY_API_KEY is not configured; using resilient search collector.")
        return []

    try:
        payload = {
            'api_key': api_key,
            'query': query,
            'search_depth': search_depth,
            'include_raw_content': True,
            'max_results': max_results,
        }
        data = _http_post_json(TAVILY_SEARCH_ENDPOINT, payload)
        results = []
        for item in data.get('results', []):
            results.append({
                'title': item.get('title', ''),
                'url': item.get('url', ''),
                'content': item.get('content', ''),
                'raw_content': (item.get('raw_content') or '')[:1500],
                'source': 'Tavily Deep Extraction',
                'retrieved_at': datetime.now(timezone.utc).isoformat(),
            })
        return results
    except Exception as e:
        logger.error(f"Tavily API error for query '{query}': {e}")
        return []


def perform_full_web_research(idea, project_type):
    """
    Stage A (Web Research):
    Executes multiple targeted searches across Brave and Tavily to gather:
    1. Competitors and alternative products
    2. Real publicly listed pricing
    3. Real customer complaints, pain points, and unmet needs
    """
    now_str = datetime.now(timezone.utc).strftime("%b %d, %Y")
    
    # 1. Formulate targeted discovery queries
    clean_idea = idea.strip()[:180]
    competitor_query = f"{clean_idea} competitors alternatives market products"
    pricing_query = f"{clean_idea} software hardware pricing plans cost"
    complaints_query = f"{clean_idea} customer complaints user reviews limitations problems site:reddit.com OR site:trustpilot.com OR site:g2.com OR product"

    # 2. Query Brave Search for broad discovery
    brave_competitors = search_brave(competitor_query, count=5)
    brave_pricing = search_brave(pricing_query, count=4)
    brave_complaints = search_brave(complaints_query, count=4)

    # 3. Query Tavily for deep extraction
    tavily_details = extract_tavily(f"{clean_idea} competitor pricing and user complaints", max_results=4)

    # 4. Consolidate sources and findings
    all_sources = []
    seen_urls = set()

    for item in (brave_competitors + brave_pricing + brave_complaints + tavily_details):
        url = item.get('url', '')
        if url and url not in seen_urls:
            seen_urls.add(url)
            all_sources.append({
                'title': item.get('title', 'Market Source'),
                'url': url,
                'snippet': (item.get('content') or item.get('description') or '')[:400],
                'source_type': item.get('source', 'Web Search'),
                'retrieved_at': item.get('retrieved_at', now_str),
                'verified': True,
            })

    return {
        'sources': all_sources,
        'has_live_web_evidence': len(all_sources) > 0,
        'brave_competitors': brave_competitors,
        'brave_pricing': brave_pricing,
        'brave_complaints': brave_complaints,
        'tavily_details': tavily_details,
        'query_timestamp': now_str,
    }
