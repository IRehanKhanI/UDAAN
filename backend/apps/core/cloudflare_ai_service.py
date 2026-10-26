import base64
import json
import logging
import os
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

logger = logging.getLogger(__name__)


class CloudflareConfigurationError(Exception):
    pass


class CloudflareRequestError(Exception):
    def __init__(self, message, *, retryable=False, retry_after=None):
        super().__init__(message)
        self.retryable = retryable
        self.retry_after = retry_after


def _cloudflare_error(error):
    try:
        payload = json.loads(error.read().decode('utf-8'))
        messages = payload.get('errors') or []
        detail = messages[0].get('message', '') if messages and isinstance(messages[0], dict) else ''
    except (ValueError, UnicodeDecodeError):
        detail = ''
    return detail or f'Cloudflare Workers AI returned HTTP {error.code}.'


def generate_cloudflare_image(*, prompt):
    """Generate one JPEG with Cloudflare Workers AI and return its decoded bytes."""
    account_id = os.getenv('CLOUDFLARE_ACCOUNT_ID', '').strip()
    token = os.getenv('CLOUDFLARE_API_TOKEN', '').strip()
    if not account_id or not token:
        raise CloudflareConfigurationError(
            'Cloudflare image generation is not configured. Add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN to backend/.env.'
        )
    model = os.getenv('CLOUDFLARE_AI_IMAGE_MODEL', '@cf/black-forest-labs/flux-1-schnell').strip()
    payload = {'prompt': prompt}
    request = Request(
        f'https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/{model}',
        data=json.dumps(payload).encode('utf-8'),
        headers={
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {token}',
        },
        method='POST',
    )
    try:
        with urlopen(request, timeout=90) as response:
            response_bytes = response.read()
            content_type = response.headers.get('Content-Type', '')
    except HTTPError as error:
        detail = _cloudflare_error(error)
        retryable = error.code in {408, 409, 425, 429, 500, 502, 503, 504}
        try:
            retry_after = float(error.headers.get('Retry-After'))
        except (TypeError, ValueError):
            retry_after = None
        raise CloudflareRequestError(detail, retryable=retryable, retry_after=retry_after) from error
    except (URLError, TimeoutError) as error:
        raise CloudflareRequestError(
            'Could not reach Cloudflare Workers AI. Check the backend network connection and try again.',
            retryable=True,
        ) from error

    if 'application/json' in content_type or response_bytes[:1] in (b'{', b'['):
        try:
            body = json.loads(response_bytes.decode('utf-8'))
        except (ValueError, UnicodeDecodeError) as error:
            raise CloudflareRequestError('Cloudflare returned an unreadable image response.') from error
        if body.get('success') is False:
            errors = body.get('errors') or []
            detail = errors[0].get('message', 'Cloudflare image generation failed.') if errors else 'Cloudflare image generation failed.'
            raise CloudflareRequestError(detail, retryable=False)
        result = body.get('result') or body
        encoded = result.get('image') if isinstance(result, dict) else None
        if not isinstance(encoded, str) or not encoded:
            raise CloudflareRequestError('Cloudflare returned no image data.')
        try:
            return base64.b64decode(encoded, validate=True), 'image/jpeg'
        except (ValueError, TypeError) as error:
            raise CloudflareRequestError('Cloudflare returned invalid image data.') from error

    if not response_bytes:
        raise CloudflareRequestError('Cloudflare returned an empty image.')
    return response_bytes, 'image/jpeg'


def generate_cloudflare_image_with_retry(*, prompt):
    attempts = 2
    for attempt in range(attempts):
        try:
            return generate_cloudflare_image(prompt=prompt)
        except CloudflareRequestError as error:
            if not error.retryable or attempt + 1 >= attempts:
                raise
            delay = error.retry_after if error.retry_after is not None else 1.0
            time.sleep(min(max(delay, 0), 5))
