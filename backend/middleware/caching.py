"""
Caching middleware for API responses.

Adds Cache-Control headers to responses based on endpoint patterns.
"""

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Callable
import hashlib
import time


class CacheControlMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add Cache-Control headers to API responses.
    
    Caching Strategy:
    - Metadata endpoints: 1 hour (data rarely changes)
    - Sample/volcano/eruption lists: 5 minutes (relatively static)
    - Individual resources: 10 minutes
    - Spatial queries: 5 minutes
    - Analytics: 15 minutes (expensive calculations)
    - GeoJSON: 10 minutes (map data)
    """
    
    # Cache durations in seconds
    CACHE_DURATIONS = {
        "/api/metadata": 3600,  # 1 hour
        "/api/samples/geojson": 600,  # 10 minutes
        "/api/volcanoes/geojson": 600,  # 10 minutes
        "/api/samples": 300,  # 5 minutes
        "/api/volcanoes": 300,  # 5 minutes
        "/api/eruptions": 300,  # 5 minutes
        "/api/spatial": 300,  # 5 minutes
        "/api/analytics": 900,  # 15 minutes
    }
    
    DEFAULT_CACHE_DURATION = 300  # 5 minutes for unmatched routes
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and add caching headers to response."""
        
        # Call the endpoint
        response = await call_next(request)
        
        # Only add caching to GET requests with 200 status
        if request.method == "GET" and response.status_code == 200:
            # Determine cache duration based on path
            cache_duration = self._get_cache_duration(request.url.path)
            
            # Add Cache-Control header
            response.headers["Cache-Control"] = f"public, max-age={cache_duration}"
            
            # Add ETag for conditional requests (based on response body hash)
            # Note: This is a simple implementation. For production, consider
            # using Redis or proper ETag generation
            if hasattr(response, 'body'):
                etag = self._generate_etag(response.body)
                response.headers["ETag"] = etag
            
            # Add Vary header to indicate response varies by these headers
            response.headers["Vary"] = "Accept, Accept-Encoding"
            
            # Add Last-Modified (current time for simplicity)
            # In production, this should be the actual modification time
            from datetime import datetime
            last_modified = datetime.utcnow().strftime('%a, %d %b %Y %H:%M:%S GMT')
            response.headers["Last-Modified"] = last_modified
        
        return response
    
    def _get_cache_duration(self, path: str) -> int:
        """Get cache duration for a given path."""
        # Check for exact matches or prefix matches
        for pattern, duration in self.CACHE_DURATIONS.items():
            if path.startswith(pattern):
                return duration
        
        return self.DEFAULT_CACHE_DURATION
    
    def _generate_etag(self, content: bytes) -> str:
        """Generate ETag from response content."""
        # Use MD5 hash of content as ETag
        content_hash = hashlib.md5(content).hexdigest()
        return f'W/"{content_hash}"'  # Weak ETag


class ConditionalRequestMiddleware(BaseHTTPMiddleware):
    """
    Middleware to handle conditional requests (If-None-Match, If-Modified-Since).
    
    Returns 304 Not Modified if the resource hasn't changed.
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process conditional request headers."""
        
        # Check for If-None-Match header (ETag-based)
        if_none_match = request.headers.get("If-None-Match")
        
        # For now, always process the request
        # In production, you'd check if the ETag matches and return 304
        response = await call_next(request)
        
        # If client sent If-None-Match and it matches our ETag, return 304
        if if_none_match and response.status_code == 200:
            response_etag = response.headers.get("ETag")
            if response_etag and if_none_match == response_etag:
                # Return 304 Not Modified
                return Response(status_code=304, headers=response.headers)
        
        return response


def add_cache_headers(
    response: Response,
    max_age: int = 300,
    public: bool = True,
    must_revalidate: bool = False
) -> Response:
    """
    Helper function to add cache headers to a response.
    
    Args:
        response: FastAPI Response object
        max_age: Cache duration in seconds (default: 5 minutes)
        public: Whether cache can be shared by proxies (default: True)
        must_revalidate: Whether cache must revalidate after expiry (default: False)
    
    Returns:
        Response with cache headers added
    """
    cache_control = []
    
    if public:
        cache_control.append("public")
    else:
        cache_control.append("private")
    
    cache_control.append(f"max-age={max_age}")
    
    if must_revalidate:
        cache_control.append("must-revalidate")
    
    response.headers["Cache-Control"] = ", ".join(cache_control)
    
    return response
