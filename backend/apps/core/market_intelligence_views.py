import csv
import io
import json
import logging
import urllib.error
import urllib.parse
import urllib.request
from datetime import date
from django.core.cache import cache

from django.db.models import Q
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.projects.models import MarketIntelligenceRecord, ProjectDraft
from .idea_views import authorized_project_drafts

logger = logging.getLogger(__name__)
NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
NOMINATIM_USER_AGENT = 'UDAAN-Market-Intelligence/1.0 (configure contact in deployment)'

METRIC_FIELDS = ('enquiries', 'sales', 'website_visits', 'conversions', 'campaign_engagement')


def _number(value):
    if value in (None, ''):
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        raise serializers.ValidationError('Metric values must be numeric.')
    if number < 0:
        raise serializers.ValidationError('Metric values cannot be negative.')
    return number


def _date(value):
    if value in (None, ''):
        return None
    try:
        return date.fromisoformat(str(value))
    except ValueError as error:
        raise serializers.ValidationError('Dates must use YYYY-MM-DD format.') from error


def _record_data(row):
    location = str(row.get('location_name') or row.get('location') or '').strip()
    if not location:
        raise serializers.ValidationError('Every row needs a location_name.')
    metrics = {field: _number(row.get(field)) for field in METRIC_FIELDS}
    return {
        'location_name': location[:180],
        'country': str(row.get('country') or '').strip()[:100],
        'state': str(row.get('state') or '').strip()[:100],
        'city': str(row.get('city') or '').strip()[:100],
        'latitude': _number(row.get('latitude')),
        'longitude': _number(row.get('longitude')),
        'period_start': _date(row.get('period_start')),
        'period_end': _date(row.get('period_end')),
        'metrics': {key: value for key, value in metrics.items() if value is not None},
        'source_label': str(row.get('source_label') or 'User-imported business data').strip()[:180],
    }


def _visible_records(request):
    query = MarketIntelligenceRecord.objects.filter(owner=request.user)
    project_id = request.query_params.get('project')
    if project_id:
        query = query.filter(project_id=project_id)
    return query


def _summary(records):
    totals = {field: 0 for field in METRIC_FIELDS}
    available = set()
    for record in records:
        for field, value in (record.metrics or {}).items():
            if field in totals and isinstance(value, (int, float)):
                totals[field] += value
                available.add(field)
    if not records or not available:
        return {
            'status': 'insufficient_data',
            'score': None,
            'reliability': 'No connected observations',
            'signals': [],
            'observations': 0,
            'metrics': {},
        }
    signals = [
        {'name': 'Recorded enquiries', 'field': 'enquiries', 'value': totals['enquiries'], 'weight': 0.25},
        {'name': 'Conversions', 'field': 'conversions', 'value': totals['conversions'], 'weight': 0.25},
        {'name': 'Sales', 'field': 'sales', 'value': totals['sales'], 'weight': 0.30},
        {'name': 'Campaign engagement', 'field': 'campaign_engagement', 'value': totals['campaign_engagement'], 'weight': 0.20},
    ]
    usable = [signal for signal in signals if signal['field'] in available]
    denominator = sum(signal['value'] for signal in usable)
    score = round(sum((signal['value'] / denominator) * signal['weight'] for signal in usable) * 100, 1) if denominator else None
    return {
        'status': 'observed',
        'score': score,
        'reliability': f'Based on {len(records)} imported observation(s); not a forecast.',
        'signals': usable,
        'observations': len(records),
        'metrics': {key: value for key, value in totals.items() if key in available},
    }


def _nominatim_search(query):
        normalized = ' '.join(str(query or '').split())
        if len(normalized) < 2:
            raise serializers.ValidationError('Search must contain at least two characters.')
        cache_key = f"market-place-search:{''.join(character if character.isalnum() else '-' for character in normalized.lower())[:120]}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached
        params = urllib.parse.urlencode({
            'q': normalized,
            'format': 'jsonv2',
            'addressdetails': 1,
            'polygon_geojson': 1,
            'limit': 8,
            'accept-language': 'en',
        })
        request = urllib.request.Request(
            f'{NOMINATIM_URL}?{params}',
            headers={'User-Agent': NOMINATIM_USER_AGENT, 'Accept': 'application/json'},
        )
        try:
            with urllib.request.urlopen(request, timeout=12) as response:
                payload = json.loads(response.read().decode('utf-8'))
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, ValueError) as error:
            logger.warning('Nominatim place search failed: %s', error)
            raise serializers.ValidationError('Place search is temporarily unavailable. Try again shortly.') from error
        results = []
        for item in payload:
            geometry = item.get('geojson') if isinstance(item.get('geojson'), dict) else None
            address = item.get('address') or {}
            results.append({
                'region_id': f'{item.get("osm_type", "")}:{item.get("osm_id", "")}',
                'name': item.get('name') or item.get('display_name', '').split(',')[0],
                'display_name': item.get('display_name', ''),
                'type': item.get('type') or item.get('addresstype') or '',
                'country': address.get('country', ''),
                'state': address.get('state', ''),
                'district': address.get('state_district') or address.get('county', ''),
                'city': address.get('city') or address.get('town') or address.get('village') or '',
                'latitude': float(item['lat']) if item.get('lat') else None,
                'longitude': float(item['lon']) if item.get('lon') else None,
                'geometry': geometry,
                'boundary_status': 'available' if geometry and geometry.get('type') in {'Polygon', 'MultiPolygon'} else 'unavailable',
                'provider': 'OpenStreetMap Nominatim',
            })
        cache.set(cache_key, results, timeout=3600)
        return results


class MarketPlaceSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            return Response({'results': _nominatim_search(request.query_params.get('q', ''))})
        except serializers.ValidationError as error:
            return Response({'error': str(error.detail)}, status=status.HTTP_400_BAD_REQUEST)


class MarketIntelligenceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        records = list(_visible_records(request))
        locations = {}
        for record in records:
            key = record.location_name.lower()
            locations.setdefault(key, {
                'name': record.location_name, 'country': record.country, 'state': record.state,
                'city': record.city, 'latitude': float(record.latitude) if record.latitude is not None else None,
                'longitude': float(record.longitude) if record.longitude is not None else None,
                'metrics': {field: 0 for field in METRIC_FIELDS}, 'observations': 0,
            })
            locations[key]['observations'] += 1
            for field, value in (record.metrics or {}).items():
                if field in METRIC_FIELDS:
                    locations[key]['metrics'][field] += value
        location_list = list(locations.values())
        return Response({'locations': location_list, 'summary': _summary(records), 'data_status': 'observed' if records else 'empty'})

    def post(self, request):
        project = None
        project_id = request.data.get('project_id')
        if project_id:
            project = authorized_project_drafts(request).filter(pk=project_id).first()
            if not project:
                return Response({'error': 'You do not have access to that project.'}, status=status.HTTP_403_FORBIDDEN)
        upload = request.FILES.get('file')
        if not upload or upload.size > 5 * 1024 * 1024:
            return Response({'error': 'Upload a CSV file up to 5 MB.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            text = upload.read().decode('utf-8-sig')
            rows = list(csv.DictReader(io.StringIO(text)))
        except (UnicodeDecodeError, csv.Error) as error:
            return Response({'error': 'The CSV could not be read as UTF-8.'}, status=status.HTTP_400_BAD_REQUEST)
        if not rows or len(rows) > 5000:
            return Response({'error': 'CSV must contain between 1 and 5,000 data rows.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            records = [_record_data(row) for row in rows]
        except serializers.ValidationError as error:
            return Response({'error': str(error.detail)}, status=status.HTTP_400_BAD_REQUEST)
        MarketIntelligenceRecord.objects.bulk_create([
            MarketIntelligenceRecord(owner=request.user, project=project, **record) for record in records
        ])
        return Response({'imported': len(records)}, status=status.HTTP_201_CREATED)
