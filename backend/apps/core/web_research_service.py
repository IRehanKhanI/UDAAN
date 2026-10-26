import json
import logging
import os
import urllib.parse
import urllib.request
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

TAVILY_SEARCH_ENDPOINT = "https://api.tavily.com/search"


def _http_post_json(url, payload, headers=None, timeout=20):
    data = json.dumps(payload).encode('utf-8')
    all_headers = {'Content-Type': 'application/json'}
    if headers:
        all_headers.update(headers)
    req = urllib.request.Request(url, data=data, headers=all_headers, method='POST')
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return json.loads(response.read().decode('utf-8'))


def search_tavily(query, search_depth="basic", max_results=5, include_raw=False):
    """
    Query Tavily Search API for live web discovery, competitor analysis, pricing, and complaints.
    Returns list of search results: [{title, url, content, raw_content, source}].
    """
    api_key = os.getenv('TAVILY_API_KEY', '').strip()
    if not api_key:
        logger.warning("TAVILY_API_KEY is not configured; using fallback collector.")
        return []

    try:
        payload = {
            'api_key': api_key,
            'query': query,
            'search_depth': search_depth,
            'include_raw_content': include_raw,
            'max_results': max_results,
        }
        data = _http_post_json(TAVILY_SEARCH_ENDPOINT, payload)
        results = []
        for item in data.get('results', []):
            results.append({
                'title': item.get('title', ''),
                'url': item.get('url', ''),
                'content': item.get('content', ''),
                'raw_content': (item.get('raw_content') or '')[:1500] if include_raw else '',
                'source': 'Tavily Web Search',
                'retrieved_at': datetime.now(timezone.utc).isoformat(),
            })
        return results
    except Exception as e:
        logger.error(f"Tavily search API error for query '{query}': {e}")
        return []


def perform_full_web_research(idea, project_type):
    """
    Stage A (Web Research via Tavily Search Engine):
    Executes targeted discovery across Tavily to gather:
    1. Competitors and alternative products
    2. Real publicly listed pricing models
    3. Real customer complaints, pain points, and unmet needs
    """
    now_str = datetime.now(timezone.utc).strftime("%b %d, %Y")
    
    clean_idea = idea.strip()[:180]
    competitor_query = f"{clean_idea} competitors alternatives market products"
    pricing_query = f"{clean_idea} software hardware pricing plans cost"
    complaints_query = f"{clean_idea} customer complaints user reviews limitations problems"

    # Targeted Tavily queries for broad coverage
    tavily_competitors = search_tavily(competitor_query, search_depth="basic", max_results=4)
    tavily_pricing = search_tavily(pricing_query, search_depth="basic", max_results=4)
    tavily_complaints = search_tavily(complaints_query, search_depth="basic", max_results=4)
    tavily_details = search_tavily(f"{clean_idea} competitor pricing and user complaints", search_depth="advanced", max_results=4, include_raw=True)

    all_sources = []
    seen_urls = set()

    for item in (tavily_competitors + tavily_pricing + tavily_complaints + tavily_details):
        url = item.get('url', '')
        if url and url not in seen_urls:
            seen_urls.add(url)
            all_sources.append({
                'title': item.get('title', 'Market Source'),
                'url': url,
                'snippet': (item.get('content') or item.get('raw_content') or '')[:400],
                'source_type': item.get('source', 'Tavily Web Search'),
                'retrieved_at': item.get('retrieved_at', now_str),
                'verified': True,
            })

    return {
        'sources': all_sources,
        'has_live_web_evidence': len(all_sources) > 0,
        'competitors': tavily_competitors,
        'pricing': tavily_pricing,
        'complaints': tavily_complaints,
        'tavily_details': tavily_details,
        'query_timestamp': now_str,
    }
